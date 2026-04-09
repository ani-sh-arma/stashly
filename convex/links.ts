// convex/links.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { DatabaseReader, DatabaseWriter } from "./_generated/server";
import { ensureTagsExist } from "./tags";

/** Validates a vault session token server-side (read-only; for use in queries). */
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

/** Returns all folder IDs reachable from the given starting folder.
 *  Only includes null (root) in the result when rootId itself is null.
 *  Uses a parentId→children adjacency map for O(n) traversal. */
async function getDescendantFolderIds(
  db: DatabaseReader,
  userId: string,
  rootId: Id<"folders"> | null,
  isVault: boolean,
): Promise<Array<Id<"folders"> | null>> {
  const allFolders = await db
    .query("folders")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const spaceFolders = allFolders.filter((f) =>
    isVault ? f.isVault === true : f.isVault !== true,
  );

  // Build parentId → children adjacency map for O(n) BFS
  const childrenOf = new Map<Id<"folders"> | null, Id<"folders">[]>();
  for (const f of spaceFolders) {
    const parentKey: Id<"folders"> | null = f.parentId ?? null;
    const siblings = childrenOf.get(parentKey);
    if (siblings) {
      siblings.push(f._id);
    } else {
      childrenOf.set(parentKey, [f._id]);
    }
  }

  const ids: Array<Id<"folders">> = [];
  const queue: Array<Id<"folders"> | null> = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current !== null) ids.push(current);
    for (const childId of childrenOf.get(current) ?? []) {
      queue.push(childId);
    }
  }
  // Include null (root) only when the search starts at the root
  return rootId === null ? [null, ...ids] : ids;
}

export const addLink = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    image: v.optional(v.string()),
    favicon: v.optional(v.string()),
    hostname: v.optional(v.string()),
    siteName: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    isVault: v.optional(v.boolean()),
    vaultToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (args.isVault === true) {
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

    // Validate folderId ownership and space match
    if (args.folderId !== undefined) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== identity.tokenIdentifier) {
        throw new Error("Folder not found or not authorized");
      }
      const folderIsVault = folder.isVault === true;
      const linkIsVault = args.isVault === true;
      if (folderIsVault !== linkIsVault) {
        throw new Error("Folder and link must be in the same space");
      }
    }

    const linkId = await ctx.db.insert("links", {
      url: args.url,
      title: args.title,
      description: args.description,
      tags: args.tags,
      image: args.image,
      favicon: args.favicon,
      hostname: args.hostname,
      siteName: args.siteName,
      folderId: args.folderId,
      isVault: args.isVault,
      userId: identity.tokenIdentifier,
      createdAt: Date.now(),
    });

    // Persist any new tags to the global tags table
    if (args.tags.length > 0) {
      await ensureTagsExist(ctx.db, identity.tokenIdentifier, args.tags);
    }

    return linkId;
  },
});

export const getLinks = query({
  args: {
    search: v.optional(v.string()),
    tag: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    recursive: v.optional(v.boolean()),
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

    let links = await ctx.db
      .query("links")
      .withIndex("by_user_and_created", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .order("desc")
      .collect();

    // Space filter (vault vs public)
    links = links.filter((l) =>
      isVault ? l.isVault === true : l.isVault !== true,
    );

    // Folder scope
    if (args.recursive) {
      const allowedIds = await getDescendantFolderIds(
        ctx.db,
        identity.tokenIdentifier,
        args.folderId ?? null,
        isVault,
      );
      const allowedIdSet = new Set(allowedIds);
      links = links.filter((l) => {
        const lid: Id<"folders"> | null = l.folderId ?? null;
        return allowedIdSet.has(lid);
      });
    } else {
      links = links.filter((l) => {
        const lid: Id<"folders"> | null = l.folderId ?? null;
        const target: Id<"folders"> | null = args.folderId ?? null;
        return lid === target;
      });
    }

    if (args.search) {
      const s = args.search.toLowerCase();
      links = links.filter(
        (l) =>
          l.title.toLowerCase().includes(s) ||
          l.url.toLowerCase().includes(s) ||
          l.description?.toLowerCase().includes(s) ||
          l.hostname?.toLowerCase().includes(s) ||
          l.tags.some((t) => t.toLowerCase().includes(s)),
      );
    }

    if (args.tag) {
      const tag = args.tag;
      links = links.filter((l) => l.tags.includes(tag));
    }

    return links;
  },
});

export const deleteLink = mutation({
  args: { id: v.id("links") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const link = await ctx.db.get(args.id);
    if (!link || link.userId !== identity.tokenIdentifier) {
      throw new Error("Not authorized");
    }
    await ctx.db.delete(args.id);
  },
});

export const getAllTags = query({
  args: {
    folderId: v.optional(v.id("folders")),
    recursive: v.optional(v.boolean()),
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

    let links = await ctx.db
      .query("links")
      .withIndex("by_user_and_created", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .collect();

    links = links.filter((l) =>
      isVault ? l.isVault === true : l.isVault !== true,
    );

    if (args.recursive) {
      const allowedIds = await getDescendantFolderIds(
        ctx.db,
        identity.tokenIdentifier,
        args.folderId ?? null,
        isVault,
      );
      const allowedIdSet = new Set(allowedIds);
      links = links.filter((l) => {
        const lid: Id<"folders"> | null = l.folderId ?? null;
        return allowedIdSet.has(lid);
      });
    } else {
      links = links.filter((l) => {
        const lid: Id<"folders"> | null = l.folderId ?? null;
        const target: Id<"folders"> | null = args.folderId ?? null;
        return lid === target;
      });
    }

    const tagSet = new Set<string>();
    links.forEach((l) => l.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  },
});

