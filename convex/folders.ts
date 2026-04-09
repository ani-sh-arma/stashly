import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { DatabaseReader, DatabaseWriter } from "./_generated/server";

/** Validates a vault session token server-side (read-only; for use in queries). */
async function validateVaultSession(
  db: DatabaseReader,
  userId: string,
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
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

/**
 * Validates a vault session token and deletes it if expired (for use in mutations).
 * This keeps the vaultSessions table from growing unbounded.
 */
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

export const createFolder = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    isVault: v.optional(v.boolean()),
    vaultToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (!name) {
      throw new Error("Folder name cannot be empty");
    }

    const isVault = args.isVault ?? false;

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

    if (args.parentId !== undefined) {
      const parentFolder = await ctx.db.get(args.parentId);
      if (!parentFolder) {
        throw new Error("Parent folder not found");
      }
      if (parentFolder.userId !== identity.tokenIdentifier) {
        throw new Error("Not authorized to use this parent folder");
      }
      if ((parentFolder.isVault ?? false) !== isVault) {
        throw new Error("Parent folder must be in the same space");
      }
    }

    return await ctx.db.insert("folders", {
      userId: identity.tokenIdentifier,
      name,
      parentId: args.parentId,
      isVault,
      createdAt: Date.now(),
    });
  },
});

export const getFolders = query({
  args: {
    parentId: v.optional(v.id("folders")),
    isVault: v.optional(v.boolean()),
    vaultToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.isVault) {
      if (
        !(await validateVaultSession(
          ctx.db,
          identity.tokenIdentifier,
          args.vaultToken,
        ))
      ) {
        return [];
      }
    }

    return await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .filter((q) => {
        const parentMatch =
          args.parentId !== undefined
            ? q.eq(q.field("parentId"), args.parentId)
            : q.eq(q.field("parentId"), undefined);
        const vaultMatch = args.isVault
          ? q.eq(q.field("isVault"), true)
          : q.neq(q.field("isVault"), true);
        return q.and(parentMatch, vaultMatch);
      })
      .collect();
  },
});

export const getFolder = query({
  args: { id: v.id("folders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const folder = await ctx.db.get(args.id);
    if (!folder || folder.userId !== identity.tokenIdentifier) return null;
    return folder;
  },
});

export const getFolderPath = query({
  args: {
    id: v.id("folders"),
    vaultToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const path: { _id: Id<"folders">; name: string }[] = [];
    let current: Id<"folders"> | undefined = args.id;
    let hasValidatedVaultSession = false;
    while (current) {
      const folder: Awaited<ReturnType<typeof ctx.db.get<"folders">>> =
        await ctx.db.get(current);
      if (!folder || folder.userId !== identity.tokenIdentifier) break;
      // Validate vault session on the first folder we encounter in the path
      if (!hasValidatedVaultSession && folder.isVault) {
        hasValidatedVaultSession = true;
        if (
          !(await validateVaultSession(
            ctx.db,
            identity.tokenIdentifier,
            args.vaultToken,
          ))
        ) {
          return [];
        }
      }
      path.unshift({ _id: folder._id, name: folder.name });
      current = folder.parentId;
    }
    return path;
  },
});

export const renameFolder = mutation({
  args: {
    id: v.id("folders"),
    name: v.string(),
    vaultToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const folder = await ctx.db.get(args.id);
    if (!folder || folder.userId !== identity.tokenIdentifier)
      throw new Error("Not authorized");

    if (folder.isVault) {
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

    const name = args.name.trim();
    if (!name) throw new Error("Folder name is required");
    await ctx.db.patch(args.id, { name });
  },
});

export const deleteFolder = mutation({
  args: {
    id: v.id("folders"),
    vaultToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const folder = await ctx.db.get(args.id);
    if (!folder || folder.userId !== identity.tokenIdentifier)
      throw new Error("Not authorized");

    if (folder.isVault) {
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

    // Collect the user's folders once, then traverse in memory.
    const userFolders = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();

    // Recursively delete all sub-folders and their links
    const toDelete: Id<"folders">[] = [args.id];
    const queue: Id<"folders">[] = [args.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const child of userFolders) {
        if (child.parentId === current) {
          toDelete.push(child._id);
          queue.push(child._id);
        }
      }
    }

    // Delete all links inside these folders
    const allLinks = await ctx.db
      .query("links")
      .withIndex("by_user_and_created", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .collect();
    const toDeleteSet = new Set(toDelete);
    for (const link of allLinks) {
      if (link.folderId && toDeleteSet.has(link.folderId)) {
        await ctx.db.delete(link._id);
      }
    }

    // Delete all folders
    for (const folderId of toDelete) {
      await ctx.db.delete(folderId);
    }
  },
});
