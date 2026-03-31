// convex/links.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addLink = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("links", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getLinks = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("links")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});
