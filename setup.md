# Stashly – Clerk Authentication Setup

This guide walks you through setting up Clerk authentication for Stashly so that Google OAuth and email/password sign-in work, and every user's links are stored separately in Convex.

---

## Prerequisites

- A [Clerk](https://clerk.com) account (free tier is fine)
- A [Convex](https://convex.dev) deployment for this project

---

## 1. Create a Clerk Application

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com) and sign in.
2. Click **"Add application"**.
3. Give it a name, e.g. **Stashly**.
4. Under **Sign-in options**, enable:
   - **Email address** (email + password)
   - **Google** (OAuth)
5. Click **Create application**.

---

## 2. Enable Google OAuth

1. In your Clerk dashboard, go to **User & Authentication → Social Connections**.
2. Find **Google** and toggle it **on**.
3. For development you can use Clerk's shared OAuth credentials. For production, create a Google OAuth app at [Google Cloud Console](https://console.cloud.google.com/) and paste the **Client ID** and **Client Secret** into Clerk.

---

## 3. Get Your Clerk API Keys

1. In the Clerk dashboard, go to **API Keys**.
2. Copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`

---

## 4. Create a Convex JWT Template in Clerk

Convex needs Clerk to issue JWTs it can verify. Set this up once:

1. In the Clerk dashboard, go to **JWT Templates**.
2. Click **New template** and select **Convex**.
3. Leave all defaults — Clerk pre-fills the correct claims for Convex.
4. Click **Save**.
5. Copy the **Issuer URL** shown on the template page (looks like `https://your-instance.clerk.accounts.dev`). This is your `CLERK_JWT_ISSUER_DOMAIN`.

---

## 5. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Convex (already set if you ran `npx convex dev`)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk routes (keep as-is)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Clerk JWT issuer for Convex (from step 4)
CLERK_JWT_ISSUER_DOMAIN=https://your-instance.clerk.accounts.dev
```

---

## 6. Configure Convex Auth

The file `convex/auth.config.ts` already reads `CLERK_JWT_ISSUER_DOMAIN` from the environment. You need to set this variable in your **Convex deployment** as well:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-instance.clerk.accounts.dev
```

Or set it in the [Convex dashboard](https://dashboard.convex.dev) under your project → **Settings → Environment Variables**.

---

## 7. Run the App

```bash
# Terminal 1 – Convex dev server
npx convex dev

# Terminal 2 – Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/sign-in` automatically because the middleware protects all routes.

---

## 8. Profile Management

Clerk's `<UserButton />` (top-right corner in the header) opens a built-in profile management UI where users can:

- Update their **name and profile picture**
- Manage **connected accounts** (e.g. add/remove Google)
- Change their **email address** or **password**
- View active **sessions** and sign out of them

No additional code is needed — this is provided by Clerk out of the box.

---

## Production Checklist

- [ ] Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_JWT_ISSUER_DOMAIN` in your production environment (e.g. Vercel → Environment Variables).
- [ ] Set `CLERK_JWT_ISSUER_DOMAIN` in Convex via `npx convex env set` or the Convex dashboard.
- [ ] Add your production domain to **Allowed origins** in the Clerk dashboard (under **Domains**).
- [ ] For Google OAuth in production: replace Clerk's dev credentials with your own Google OAuth app credentials in the Clerk dashboard → Social Connections → Google.
- [ ] Ensure `NEXT_PUBLIC_CONVEX_URL` points to your production Convex deployment.

---

## Architecture Notes

- **Data isolation**: Every link stored in Convex has a `userId` field set to the Clerk `tokenIdentifier` (a stable, globally unique string). All queries and mutations are scoped to the signed-in user — users can never see or delete each other's links.
- **Auth flow**: `ClerkProvider` wraps the app and issues JWTs. `ConvexProviderWithClerk` automatically attaches the JWT to every Convex request. Convex verifies the JWT using the JWKS endpoint published by Clerk.
- **Route protection**: `middleware.ts` redirects unauthenticated visitors to `/sign-in` for all routes except `/sign-in` and `/sign-up` themselves.
