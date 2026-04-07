// convex/links.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const links = await ctx.db
      .query("links")
      .withIndex("by_user_and_created", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .collect();
    const tagSet = new Set<string>();
    links.forEach((l) => l.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  },
});
