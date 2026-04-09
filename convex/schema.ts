import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  links: defineTable({
    userId: v.string(),
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    createdAt: v.number(),
    image: v.optional(v.string()),
    favicon: v.optional(v.string()),
    hostname: v.optional(v.string()),
    siteName: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    isVault: v.optional(v.boolean()),
  })
    .index("by_created", ["createdAt"])
    .index("by_user_and_created", ["userId", "createdAt"]),

  folders: defineTable({
    userId: v.string(),
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    isVault: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  vaultSettings: defineTable({
    userId: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
  }).index("by_user", ["userId"]),

  vaultSessions: defineTable({
    userId: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),
});
