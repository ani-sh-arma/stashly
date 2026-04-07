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
  })
    .index("by_created", ["createdAt"])
    .index("by_user_and_created", ["userId", "createdAt"]),
});
