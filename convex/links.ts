// convex/links.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { DatabaseReader } from "./_generated/server";

/** Validates a vault session token server-side. Returns true if valid. */
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

/** Returns all folder IDs reachable from the given starting folder.
 *  Only includes null (root) in the result when rootId itself is null. */
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

  const ids: Array<Id<"folders">> = [];
  const queue: Array<Id<"folders"> | null> = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current !== null) ids.push(current);
    for (const f of spaceFolders) {
      const parentMatch =
        current === null
          ? f.parentId === undefined
          : f.parentId === current;
      if (parentMatch) queue.push(f._id);
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
        !args.vaultToken ||
        !(await validateVaultSession(
          ctx.db,
          identity.tokenIdentifier,
          args.vaultToken,
        ))
      ) {
        throw new Error("Vault session invalid or expired");
      }
    }

    return await ctx.db.insert("links", {
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

