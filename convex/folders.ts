import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const createFolder = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    isVault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (!name) {
      throw new Error("Folder name cannot be empty");
    }

    const isVault = args.isVault ?? false;

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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const all = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();
    return all.filter((f) => {
      const parentMatch =
        args.parentId !== undefined
          ? f.parentId === args.parentId
          : f.parentId === undefined;
      const vaultMatch = args.isVault
        ? f.isVault === true
        : f.isVault !== true;
      return parentMatch && vaultMatch;
    });
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
  args: { id: v.id("folders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const path: { _id: Id<"folders">; name: string }[] = [];
    let current: Id<"folders"> | undefined = args.id;
    while (current) {
      const folder: Awaited<ReturnType<typeof ctx.db.get<"folders">>> =
        await ctx.db.get(current);
      if (!folder || folder.userId !== identity.tokenIdentifier) break;
      path.unshift({ _id: folder._id, name: folder.name });
      current = folder.parentId;
    }
    return path;
  },
});

export const renameFolder = mutation({
  args: { id: v.id("folders"), name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const folder = await ctx.db.get(args.id);
    if (!folder || folder.userId !== identity.tokenIdentifier)
      throw new Error("Not authorized");
    await ctx.db.patch(args.id, { name: args.name.trim() });
  },
});

export const deleteFolder = mutation({
  args: { id: v.id("folders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const folder = await ctx.db.get(args.id);
    if (!folder || folder.userId !== identity.tokenIdentifier)
      throw new Error("Not authorized");

    // Recursively delete all sub-folders and their links
    const toDelete: Id<"folders">[] = [args.id];
    const queue: Id<"folders">[] = [args.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = await ctx.db
        .query("folders")
        .withIndex("by_user", (q) =>
          q.eq("userId", identity.tokenIdentifier),
        )
        .collect();
      for (const child of children) {
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
    for (const link of allLinks) {
      if (link.folderId && toDelete.includes(link.folderId)) {
        await ctx.db.delete(link._id);
      }
    }

    // Delete all folders
    for (const folderId of toDelete) {
      await ctx.db.delete(folderId);
    }
  },
});
