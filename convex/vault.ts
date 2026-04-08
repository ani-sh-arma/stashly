import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Generates a cryptographically random hex string of the given byte length. */
function generateRandomHex(byteCount: number): string {
  const array = new Uint8Array(byteCount);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 16-byte random salt for PBKDF2. */
function generateSalt(): string {
  return generateRandomHex(16);
}

/** 32-byte cryptographically random session token. */
function generateSessionToken(): string {
  return generateRandomHex(32);
}

/**
 * Fixed 24-hour session lifetime.
 * Sessions are not sliding-window; they expire 24 h after creation
 * regardless of activity. Re-authentication is required after expiry.
 */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

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

    validatePassword(args.password);

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

    // Immediately issue a session so the user doesn't need to log in again
    const token = generateSessionToken();
    await ctx.db.insert("vaultSessions", {
      userId: identity.tokenIdentifier,
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return token;
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
    if (!settings) return null;

    const hash = await hashPassword(args.password, settings.salt);
    if (!timingSafeEqual(hash, settings.passwordHash)) return null;

    const token = generateSessionToken();
    await ctx.db.insert("vaultSessions", {
      userId: identity.tokenIdentifier,
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return token;
  },
});

export const invalidateVaultSession = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const session = await ctx.db
      .query("vaultSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (session && session.userId === identity.tokenIdentifier) {
      await ctx.db.delete(session._id);
    }
  },
});

export const changeVaultPassword = mutation({
  args: { oldPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    validatePassword(args.newPassword);

    const settings = await ctx.db
      .query("vaultSettings")
      .withIndex("by_user", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .first();
    if (!settings) throw new Error("Vault not set up");

    const oldHash = await hashPassword(args.oldPassword, settings.salt);
    if (!timingSafeEqual(oldHash, settings.passwordHash))
      throw new Error("Incorrect password");

    const newSalt = generateSalt();
    const newHash = await hashPassword(args.newPassword, newSalt);
    await ctx.db.patch(settings._id, {
      passwordHash: newHash,
      salt: newSalt,
    });

    // Invalidate all existing sessions after password change
    const sessions = await ctx.db
      .query("vaultSessions")
      .withIndex("by_user", (q) =>
        q.eq("userId", identity.tokenIdentifier),
      )
      .collect();
    await Promise.all(sessions.map((s) => ctx.db.delete(s._id)));
  },
});
