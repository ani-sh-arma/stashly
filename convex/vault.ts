import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const hasVault = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const settings = await ctx.db
      .query("vaultSettings")
      .withIndex("by_user", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .first();
    return settings !== null;
  },
});

export const setupVault = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check vault doesn't already exist
    const existing = await ctx.db
      .query("vaultSettings")
      .withIndex("by_user", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .first();
    if (existing) throw new Error("Vault already set up");

    const salt = generateSalt();
    const passwordHash = await hashPassword(args.password, salt);

    await ctx.db.insert("vaultSettings", {
      userId: identity.tokenIdentifier,
      passwordHash,
      salt,
    });
  },
});

export const verifyVaultPassword = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const settings = await ctx.db
      .query("vaultSettings")
      .withIndex("by_user", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .first();
    if (!settings) return false;

    const hash = await hashPassword(args.password, settings.salt);
    return hash === settings.passwordHash;
  },
});

export const changeVaultPassword = mutation({
  args: { oldPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const settings = await ctx.db
      .query("vaultSettings")
      .withIndex("by_user", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .first();
    if (!settings) throw new Error("Vault not set up");

    const oldHash = await hashPassword(args.oldPassword, settings.salt);
    if (oldHash !== settings.passwordHash)
      throw new Error("Incorrect password");

    const newSalt = generateSalt();
    const newHash = await hashPassword(args.newPassword, newSalt);
    await ctx.db.patch(settings._id, {
      passwordHash: newHash,
      salt: newSalt,
    });
  },
});
