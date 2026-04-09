import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { DatabaseReader, DatabaseWriter } from "./_generated/server";

// ---------------------------------------------------------------------------
// Vault session helpers (mirrored from links.ts for isolation)
// ---------------------------------------------------------------------------

async function validateVaultSession(
  db: DatabaseReader,
  userId: string,
  token: string,
): Promise<boolean> {
  const session = await db
    .query("vaultSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  return (
    session !== null &&
    session.userId === userId &&
    session.expiresAt > Date.now()
  );
}

async function validateAndCleanVaultSession(
  db: DatabaseWriter,
  userId: string,
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const session = await db
    .query("vaultSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  if (session === null) return false;
  if (session.expiresAt <= Date.now()) {
    await db.delete(session._id);
    return false;
  }
  return session.userId === userId;
}

// ---------------------------------------------------------------------------
// Normalisation helper (shared logic)
// ---------------------------------------------------------------------------

function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

// ---------------------------------------------------------------------------
// ensureTagsExist – called from addLink to persist new tags in one batch
// ---------------------------------------------------------------------------

/**
 * Ensure a set of tag names exists for the user+space, creating any missing
 * ones.  All names are normalised and deduplicated before any DB work.
 * Existing tags are fetched in a single query; inserts run in parallel.
 */
export async function ensureTagsExist(
  db: DatabaseWriter,
  userId: string,
  tagNames: string[],
  isVault: boolean,
): Promise<void> {
  // Normalize, deduplicate, drop empties
  const normalized = [
    ...new Set(tagNames.map(normalizeTagName).filter(Boolean)),
  ];
  if (normalized.length === 0) return;

  // Fetch all existing tags for this user in one query, then filter by space
  const existingTags = await db
    .query("tags")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const existingNames = new Set(
    existingTags
      .filter((t) => (isVault ? t.isVault === true : t.isVault !== true))
      .map((t) => t.name),
  );

  const now = Date.now();
  await Promise.all(
    normalized
      .filter((name) => !existingNames.has(name))
      .map((name) =>
        db.insert("tags", {
          userId,
          name,
          isVault: isVault ? true : undefined,
          createdAt: now,
        }),
      ),
  );
}

// ---------------------------------------------------------------------------
// Public Convex functions
// ---------------------------------------------------------------------------

export const getUserTags = query({
  args: {
    isVault: v.optional(v.boolean()),
    vaultToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const isVault = args.isVault === true;

    if (isVault) {
      if (
        !args.vaultToken ||
        !(await validateVaultSession(
          ctx.db,
          identity.tokenIdentifier,
          args.vaultToken,
        ))
      ) {
        return [];
      }
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();

    return tags
      .filter((t) => (isVault ? t.isVault === true : t.isVault !== true))
      .map((t) => t.name)
      .sort();
  },
});

export const createTag = mutation({
  args: {
    name: v.string(),
    isVault: v.optional(v.boolean()),
    vaultToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const isVault = args.isVault === true;

    if (isVault) {
      if (
        !(await validateAndCleanVaultSession(
          ctx.db,
          identity.tokenIdentifier,
          args.vaultToken,
        ))
      ) {
        throw new Error("Vault session invalid or expired");
      }
    }

    const normalized = normalizeTagName(args.name);
    if (!normalized) throw new Error("Invalid tag name");

    // Check if this tag already exists in this space for this user
    const existingForName = await ctx.db
      .query("tags")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("name", normalized),
      )
      .collect();

    const alreadyExists = existingForName.some((t) =>
      isVault ? t.isVault === true : t.isVault !== true,
    );

    if (!alreadyExists) {
      await ctx.db.insert("tags", {
        userId: identity.tokenIdentifier,
        name: normalized,
        isVault: isVault ? true : undefined,
        createdAt: Date.now(),
      });
    }

    return normalized;
  },
});
