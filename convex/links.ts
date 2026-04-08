// convex/links.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { DatabaseReader } from "./_generated/server";

/** Returns all folder IDs (including root=null) reachable from the given starting folder. */
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
  return [null, ...ids];
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.db.insert("links", {
      ...args,
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let links = await ctx.db
      .query("links")
      .withIndex("by_user_and_created", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .order("desc")
      .collect();

    // Space filter (vault vs public)
    const isVault = args.isVault === true;
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
      links = links.filter((l) => {
        const lid: Id<"folders"> | null = l.folderId ?? null;
        return allowedIds.some((id) => id === lid);
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let links = await ctx.db
      .query("links")
      .withIndex("by_user_and_created", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .collect();

    const isVault = args.isVault === true;
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
      links = links.filter((l) => {
        const lid: Id<"folders"> | null = l.folderId ?? null;
        return allowedIds.some((id) => id === lid);
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
