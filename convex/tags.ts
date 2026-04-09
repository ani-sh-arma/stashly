import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { DatabaseWriter } from "./_generated/server";

/** Ensure a set of tag names exists for the user, creating any missing ones. */
export async function ensureTagsExist(
  db: DatabaseWriter,
  userId: string,
  tagNames: string[],
): Promise<void> {
  for (const name of tagNames) {
    if (!name) continue;
    const existing = await db
      .query("tags")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", userId).eq("name", name),
      )
      .first();
    if (!existing) {
      await db.insert("tags", {
        userId,
        name,
        createdAt: Date.now(),
      });
    }
  }
}

export const getUserTags = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .collect();

    return tags.map((t) => t.name).sort();
  },
});

export const createTag = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const normalized = args.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (!normalized) throw new Error("Invalid tag name");

    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("name", normalized),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("tags", {
        userId: identity.tokenIdentifier,
        name: normalized,
        createdAt: Date.now(),
      });
    }

    return normalized;
  },
});
