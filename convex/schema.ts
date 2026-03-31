import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  links: defineTable({
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),
});
