# Stashly — Complete Project Documentation for Mobile App Development

> **Purpose:** This document is a comprehensive, LLM-optimised reference for building a React Native (Expo) mobile app for Stashly. Every feature, UI detail, colour, data model, API call, and mobile-native enhancement is captured here. Read top-to-bottom before writing any code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Backend — Convex Data Model](#3-backend--convex-data-model)
4. [Backend — API Reference](#4-backend--api-reference)
5. [Authentication — Clerk](#5-authentication--clerk)
6. [Design System & Theming](#6-design-system--theming)
7. [Feature Inventory](#7-feature-inventory)
   - 7.1 [App Shell / Navigation](#71-app-shell--navigation)
   - 7.2 [Link Card](#72-link-card)
   - 7.3 [Folder Card](#73-folder-card)
   - 7.4 [Breadcrumb Navigation](#74-breadcrumb-navigation)
   - 7.5 [Search & Filtering](#75-search--filtering)
   - 7.6 [Add Link Flow](#76-add-link-flow)
   - 7.7 [Create Folder Modal](#77-create-folder-modal)
   - 7.8 [Tag Selector](#78-tag-selector)
   - 7.9 [Private Vault](#79-private-vault)
   - 7.10 [Empty States](#710-empty-states)
   - 7.11 [Loading Skeletons](#711-loading-skeletons)
   - 7.12 [Error Boundary](#712-error-boundary)
8. [Screen Inventory (Mobile)](#8-screen-inventory-mobile)
9. [Mobile App Architecture](#9-mobile-app-architecture)
10. [Mobile-Native Features to Add](#10-mobile-native-features-to-add)
11. [Environment Variables](#11-environment-variables)
12. [Recommended Expo/RN Dependencies](#12-recommended-exporn-dependencies)

---

## 1. Project Overview

**Stashly** is a personal link-management / bookmarking application. Users save URLs with rich previews (OG image, favicon, title, description), organise them into nested folders, filter by tags, and search across all their stashes. A **Private Vault** feature provides a separate, password-protected space for sensitive links.

### Core Value Proposition
- Save any URL in seconds with automatic metadata fetching (title, description, thumbnail image, favicon).
- Organise links in infinitely-nested folders (normal space) or a password-protected vault space.
- Filter links by tag pills or full-text search within any folder depth.
- Paste multiple URLs at once for bulk saving.
- Mobile companion brings share-sheet link-saving and biometric vault unlock.

---

## 2. Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Frontend (web) | Next.js | 16.2.1 |
| Frontend (mobile) | React Native + Expo | Target: SDK 52+ |
| Backend / realtime DB | Convex | ^1.34.1 |
| Authentication | Clerk | @clerk/nextjs ^7 (web); @clerk/expo for mobile |
| Styling (web) | Tailwind CSS v4 + CSS custom properties | |
| Styling (mobile) | StyleSheet / NativeWind or plain RN StyleSheet | |
| Fonts (web) | Geist Sans + Geist Mono (Google Fonts via next/font) | |
| Fonts (mobile) | expo-font + @expo-google-fonts/geist-sans | |
| Package manager | Bun (bun.lock present) | |

---

## 3. Backend — Convex Data Model

The Convex backend lives in `convex/`. All tables are **user-scoped** by `userId = identity.tokenIdentifier` (Clerk token identifier, NOT the Clerk subject).

### 3.1 `links` Table

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | `string` | ✅ | `identity.tokenIdentifier` |
| `url` | `string` | ✅ | Full URL, always has `http://` or `https://` |
| `title` | `string` | ✅ | User-provided or fetched from OG/meta |
| `description` | `string` | ❌ | OG description |
| `tags` | `string[]` | ✅ | Normalised: lowercase, `[a-z0-9-]` only |
| `createdAt` | `number` | ✅ | `Date.now()` ms timestamp |
| `image` | `string` | ❌ | OG image URL |
| `favicon` | `string` | ❌ | Favicon URL |
| `hostname` | `string` | ❌ | e.g. `github.com` |
| `siteName` | `string` | ❌ | OG site name |
| `folderId` | `Id<"folders">` | ❌ | `undefined` = root |
| `isVault` | `boolean` | ❌ | `true` = vault link |

**Indexes:** `by_created` → `[createdAt]`, `by_user_and_created` → `[userId, createdAt]`

### 3.2 `folders` Table

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | `string` | ✅ | |
| `name` | `string` | ✅ | Trimmed, non-empty |
| `parentId` | `Id<"folders">` | ❌ | `undefined` = root-level |
| `isVault` | `boolean` | ❌ | Vault folder |
| `createdAt` | `number` | ✅ | |

**Index:** `by_user` → `[userId]`

### 3.3 `vaultSettings` Table

Stores the user's vault password hash + salt (PBKDF2-SHA256, 100 000 iterations, 16-byte salt).

| Field | Type |
|---|---|
| `userId` | `string` |
| `passwordHash` | `string` (hex) |
| `salt` | `string` (hex) |

**Index:** `by_user` → `[userId]`

### 3.4 `vaultSessions` Table

Server-issued session tokens valid for 24 hours. Every vault query/mutation requires a valid token.

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | |
| `token` | `string` | 32-byte random hex |
| `expiresAt` | `number` | `Date.now() + 86_400_000` |

**Indexes:** `by_user` → `[userId]`, `by_token` → `[token]`

### 3.5 `tags` Table

Global tag registry per user per space. Auto-populated whenever a link is saved with tags.

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | |
| `name` | `string` | Normalised |
| `isVault` | `boolean` | ❌ optional |
| `createdAt` | `number` | |

**Indexes:** `by_user`, `by_user_and_name`

---

## 4. Backend — API Reference

All functions live in `convex/` and are consumed via `convex/react` hooks (`useQuery`, `useMutation`, `useAction`).

### 4.1 `api.links`

#### `addLink` — Mutation

```ts
addLink({
  url: string,
  title: string,
  description?: string,
  tags: string[],
  image?: string,
  favicon?: string,
  hostname?: string,
  siteName?: string,
  folderId?: Id<"folders">,
  isVault?: boolean,
  vaultToken?: string,
}) => Id<"links">
```

- Requires auth. Vault links require valid `vaultToken`.
- Tags are normalised server-side: lowercased, stripped to `[a-z0-9-]`, deduplicated.
- Auto-calls `ensureTagsExist` to persist new tags.
- Validates `folderId` ownership and space consistency (vault/non-vault must match).

#### `getLinks` — Query

```ts
getLinks({
  search?: string,         // case-insensitive substring match on title, url, description, hostname, tags
  tag?: string,            // exact tag filter
  folderId?: Id<"folders">,
  recursive?: boolean,     // if true, includes all subfolders
  isVault?: boolean,
  vaultToken?: string,
}) => Link[]
```

- Returns `[]` for unauthenticated users or invalid vault token.
- Results ordered by `createdAt` DESC.
- Vault links are completely hidden unless a valid vault token is supplied.

#### `deleteLink` — Mutation

```ts
deleteLink({ id: Id<"links"> }) => void
```

No vault token required (ownership check by `userId` only).

#### `getAllTags` — Query

```ts
getAllTags({
  folderId?: Id<"folders">,
  recursive?: boolean,
  isVault?: boolean,
  vaultToken?: string,
}) => string[]
```

Returns sorted unique tags from links in the current scope.

---

### 4.2 `api.folders`

#### `createFolder` — Mutation

```ts
createFolder({
  name: string,
  parentId?: Id<"folders">,
  isVault?: boolean,
  vaultToken?: string,
}) => Id<"folders">
```

#### `getFolders` — Query

```ts
getFolders({
  parentId?: Id<"folders">,
  isVault?: boolean,
  vaultToken?: string,
}) => Folder[]
```

#### `getFolderPath` — Query

Returns the breadcrumb path from root to the given folder.

```ts
getFolderPath({
  id: Id<"folders">,
  vaultToken?: string,
}) => { _id: Id<"folders">; name: string }[]
```

#### `renameFolder` — Mutation

```ts
renameFolder({ id, name, vaultToken? }) => void
```

#### `deleteFolder` — Mutation

```ts
deleteFolder({ id, vaultToken? }) => void
```

Recursively deletes all sub-folders and their links (BFS traversal).

---

### 4.3 `api.vault`

#### `hasVault` — Query

```ts
hasVault() => boolean
```

Returns `true` if the user has set up a vault password.

#### `setupVault` — Mutation

```ts
setupVault({ password: string }) => string  // session token
```

- Minimum 8 characters.
- Stores PBKDF2 hash. Issues a 24-hour session token immediately.
- Throws if vault already exists.

#### `verifyVaultPassword` — Mutation

```ts
verifyVaultPassword({ password: string }) => string | null
```

Returns a 24-hour session token on success, `null` on wrong password.

#### `invalidateVaultSession` — Mutation

```ts
invalidateVaultSession({ token: string }) => void
```

Call when the user locks the vault or signs out.

#### `changeVaultPassword` — Mutation

```ts
changeVaultPassword({ oldPassword: string, newPassword: string }) => void
```

Invalidates all existing sessions after changing password.

---

### 4.4 `api.tags`

#### `getUserTags` — Query

```ts
getUserTags({ isVault?: boolean, vaultToken?: string }) => string[]
```

Returns all tag names for the current user/space. Used to populate the tag autocomplete dropdown.

#### `createTag` — Mutation

```ts
createTag({ name: string, isVault?: boolean, vaultToken?: string }) => string | null
```

Returns the normalised tag name, or `null` on failure.

---

### 4.5 `api.metadata`

#### `fetchUrlMetadata` — Action (server-side HTTP)

```ts
fetchUrlMetadata({ url: string }) => {
  title?: string,
  description?: string,
  image?: string,
  favicon?: string,
  hostname?: string,
  siteName?: string,
  error?: string,
}
```

Called as a Convex **action** (not a query/mutation) — it performs an HTTP fetch of the URL on the server and parses Open Graph / meta tags. Called with `useAction`.

---

## 5. Authentication — Clerk

### Web Setup

```
ClerkProvider (publishableKey, appearance)
  └─ ConvexProviderWithClerk (client, useAuth)
       └─ App
```

- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in/sign-up redirect: `/`
- Middleware: `clerkMiddleware` protects all routes, public routes are `/sign-in` and `/sign-up`.
- Convex auth uses `identity.tokenIdentifier` (not `identity.subject`) as the user ID in all tables.

### Convex Auth Config (`convex/auth.config.ts`)

```ts
providers: [{
  domain: process.env.CLERK_JWT_ISSUER_DOMAIN,  // e.g. https://xxx.clerk.accounts.dev
  applicationID: "convex",
}]
```

### Mobile Setup (Expo)

Use `@clerk/expo` and `ConvexProviderWithClerk` from `convex/react-clerk`.

```tsx
import { ClerkProvider, useAuth } from "@clerk/expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const tokenCache = {
  getToken: (key: string) => SecureStore.getItemAsync(key),
  saveToken: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};

export default function App() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <RootNavigator />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

---

## 6. Design System & Theming

### 6.1 Colour Palette

All colours are dark-mode only (no light mode). Use these exact values in the React Native theme.

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0f0f12` | Screen background |
| `foreground` | `#e4e6eb` | Primary text |
| `surface-primary` | `#1a1a1e` | Cards, modals |
| `surface-secondary` | `#252530` | Input backgrounds, secondary cards |
| `surface-tertiary` | `#2f2f38` | Skeleton loaders, hover states |
| `surface-hover` | `#343842` | Active / pressed states |
| `border-primary` | `#2f3139` | Main borders, dividers |
| `border-secondary` | `#1f1f26` | Subtle inner borders, tag separators |
| `accent-primary` | `#06b6d4` | Cyan — primary CTA, active tabs, tags, links |
| `accent-secondary` | `#0d9488` | Teal — secondary accent |
| `accent-muted` | `#0e7490` | Muted accent for backgrounds |

**Vault Mode Overrides** (when Private Vault is active):

| Token | Hex | Usage |
|---|---|---|
| `vault-background` | `#0d0d12` | Screen bg in vault mode |
| `vault-border` | `violet-900/30` = rgba(76,29,149,0.3) | Borders |
| `vault-banner-bg` | `violet-950/30` = rgba(46,16,101,0.3) | Info banner |
| `vault-accent` | `#a78bfa` (violet-400) | Active state colour |
| `vault-accent-bg` | `violet-500/20` = rgba(139,92,246,0.2) | Icon backgrounds |
| `vault-button` | `#7c3aed` (violet-600) | Vault CTA buttons |
| `vault-button-hover` | `#6d28d9` (violet-700) | |

### 6.2 Typography

- **Primary font:** Geist Sans (sans-serif, geometric)
- **Mono font:** Geist Mono (used for code/URLs)
- **Font smoothing:** antialiased
- **Feature settings:** `"rlig" 1, "calt" 1` (ligatures + contextual alternates)

Typical sizes in the web app (map to React Native equivalents):

| Role | Size | Weight | Colour |
|---|---|---|---|
| App name / logo text | 18px / lg | 700 bold | foreground |
| Section headers (FOLDERS, LINKS) | 12px / xs | 600 semibold uppercase | foreground/50 |
| Card title | 14px / sm | 600 semibold | foreground |
| Card description | 12px / xs | 400 | foreground/50 |
| Site name / domain | 12px / xs | 500 medium | foreground/60 |
| Timestamp | 12px / xs | 400 | foreground/40 |
| Tags | 12px / xs | 500 | accent-primary |
| Button text (primary) | 14px / sm | 600 semibold | background (on accent) or white |
| Button text (secondary) | 12px / xs | 600 semibold | foreground/60 |
| Labels (form) | 12px / xs | 600 semibold uppercase | foreground/70 |
| Body / input | 14px / sm | 400 | foreground |
| Error text | 12px / xs | 400 | red-400 = #f87171 |
| Placeholder | 14px / sm | 400 | foreground/40 |

### 6.3 Spacing & Border Radius

| Component | Border Radius |
|---|---|
| Screens / modals | 12px (xl) |
| Card | 8px (lg) |
| Input | 8px (lg) |
| Tag pill | 9999px (full, rounded-full) |
| Button (primary) | 8–12px |
| Icon wrapper | 8px (md) |
| Small icon wrapper | 4px |
| Bottom sheet (modal) | 16px top corners on mobile |

**Standard padding:**
- Screen horizontal: 16px
- Card inner: 12px
- Modal inner: 20px (px-5)
- Input: 12px × 10px (px-3 py-2.5)

### 6.4 Shadows

- Cards at rest: none / very subtle
- Modals: `shadow-2xl shadow-black/40` (large shadow, 40% black opacity)
- Primary button: `shadow-lg shadow-violet-900/30`
- Cards on hover (web) / pressed (mobile): `shadow-lg shadow-accent-primary/5`

### 6.5 Gradients

| Location | Gradient |
|---|---|
| Add Link button (normal mode) | `from-violet-600 to-indigo-600` (left → right) |
| Add Link button (vault mode) | `from-violet-600 to-purple-600` |
| Sign-in logo icon | `from-violet-600 to-indigo-600` (br diagonal) |
| Sign-in app name text | `from-violet-400 to-indigo-400` (text gradient) |
| Card thumbnail fallback background | `from-surface-secondary to-surface-tertiary` (br diagonal) |
| Clerk primary button | `from-cyan-500 to-emerald-500` |

### 6.6 Animations

| Name | Duration | Easing | Details |
|---|---|---|---|
| `slide-up` | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Y +16px → 0, opacity 0→1. Used on modals |
| `fade-in` | 200ms | `ease-out` | Opacity 0→1. Used on modal backdrop |
| `transition-smooth` | 200ms | `ease-out` | Used on all interactive elements |
| Spinner | continuous | linear | Rotating SVG circle, used during async ops |
| Skeleton pulse | continuous | CSS `animate-pulse` | Surface-tertiary placeholders |
| Card thumbnail hover scale | 200ms | smooth | Scale 1→1.05 on image hover |
| Active scale | instant | — | `active:scale-95` on Add Link button |

Respect `prefers-reduced-motion`: disable all animations when set.

### 6.7 Icons

The web app uses inline SVG icons (heroicons style, stroke-based, strokeWidth=2). For React Native, use `@expo/vector-icons` (Ionicons / Heroicons) or inline SVG via `react-native-svg`.

Key icons used:

| Purpose | Icon description |
|---|---|
| App logo | Link/chain icon (two chain links) |
| Folder | Open folder path |
| Add / plus | Plus cross |
| Delete | Trash / bin |
| Search | Magnifier |
| Close / X | X mark |
| Vault (locked) | Padlock closed |
| Vault (unlocked) | Padlock open |
| Home / breadcrumb root | House outline |
| Chevron right | Breadcrumb separator |
| Edit / rename | Pencil |
| Show password | Eye |
| Hide password | Eye with slash |
| Tag | Hash # (inline text) |
| Recursive search | Stacked lines with shorter bottom |
| Check / success | Checkmark circle |
| Warning | Triangle exclamation |
| Spinner | Circle arc (animated) |
| Bookmark (sign-in logo) | Bookmark / save ribbon |

---

## 7. Feature Inventory

### 7.1 App Shell / Navigation

#### Header (Sticky, web)

The web app has a single sticky header at the top. On mobile this maps to a **top navigation bar** (possibly custom, not the default React Navigation header for more control).

**Header contents:**
1. **Logo area** (left): 28×28px rounded-lg icon container + "Stashly" text
   - Normal mode: `bg-accent-primary/20 border-accent-primary/40`, cyan link icon
   - Vault mode: `bg-violet-500/20 border-violet-500/40`, violet link icon
2. **Actions** (right): New Folder button | Add Link button | User avatar (Clerk UserButton)
   - New Folder: icon + "New Folder" label (icon-only on small screens)
   - Add Link: gradient button, icon + "Add Link" label
3. **Tab bar** (below header actions): "My Links" tab | "Private Vault" tab
   - Active tab: bottom border in accent colour, coloured text
   - Inactive tab: grey/muted
4. **Vault info banner** (only when vault mode active): violet strip "Private Vault - contents are hidden from global search"

#### Tab System

Two modes / "spaces":

| Mode | UI Colour | Purpose |
|---|---|---|
| My Links (normal) | Cyan / `accent-primary` | All non-vault links and folders |
| Private Vault | Violet (`violet-400` / `violet-500`) | Password-protected links and folders |

Switching to Private Vault:
- First time: shows **setup modal** (create password)
- Subsequent times (if locked): shows **unlock modal** (enter password)
- If already unlocked in session: switches immediately
- Exiting vault: calls `invalidateVaultSession`, clears token from state

#### Bottom Navigation (Mobile-specific)

Replace the web tab bar with a React Native **bottom tab bar**:

```
[ My Links ]  [ Vault ]  [ + Add ]  [ Search ]  [ Profile ]
```

Or a simpler 3-tab approach:
```
[ My Links ]  [ + Add ]  [ Profile ]
```

The vault can be a top-level tab. The `+` (Add Link) button should be a prominent FAB (Floating Action Button) or center tab button.

---

### 7.2 Link Card

**Layout:** Vertical card with image thumbnail on top, content below.

```
┌─────────────────────────────────┐
│  [16:9 thumbnail image]          │
│  (or fallback: centered favicon) │
├─────────────────────────────────┤
│ 🔗favicon  site name        2d  │
│ Title of the saved link (2 lines)│
│ Description text (2 lines)       │
│ ─────────────────────────────── │
│ #tag1  #tag2  +1                 │
└─────────────────────────────────┘
```

**Card state — rest:**
- Background: `surface-primary`
- Border: `border-primary`

**Card state — hover/pressed:**
- Border: `accent-primary/40`
- Shadow: `shadow-lg shadow-accent-primary/5`

**Thumbnail area:**
- Aspect ratio: 16:9
- If `image` exists: renders img with `object-cover`, on hover scales to 1.05
- Fallback (no image or load error): gradient background + centered 48×48px rounded-lg container with favicon or first letter of domain

**Content area padding:** 12px (p-3)

**Site info row:**
- Favicon: 14×14px, rounded-sm. Fallback: 14×14px `bg-accent-primary/20` square
- Site name or domain hostname (truncated): `text-foreground/60` `text-xs` `font-medium`
- Timestamp (right-aligned): `text-foreground/40` `text-xs`

**Timestamp formatting:**
- < 1 minute: "now"
- < 1 hour: "Xm"
- < 24 hours: "Xh"
- < 8 days: "Xd"
- Otherwise: "Jan 5" format

**Title:** 14px semibold, max 2 lines, `hover:text-accent-primary`. Wraps to 2 lines.

**Description:** 12px, foreground/50, max 2 lines, optional.

**Tags:** Only shown if `tags.length > 0`. Separated by `border-t border-border-secondary` + 10px top margin/padding.
- Show first 3 tags as `#tagname` pills: `bg-accent-primary/10 text-accent-primary border border-accent-primary/20 rounded-full px-2 py-0.5 text-xs`
- If more than 3: `+N` text in `text-foreground/50`

**Delete button (hover/focus-within only):**
- Position: absolute, top-right (top-2, right-2)
- Size: 28×28px rounded-md
- Background: `bg-surface-primary/80 border border-border-primary`
- Visible: opacity 0 → 1 on group hover / group focus-within
- Hover state: `hover:bg-red-950/30 hover:border-red-500/40`
- Icon: trash icon, `text-foreground/50`, turns `text-red-400` on hover
- Deleting state: spinning SVG circle icon
- On mobile: show via long-press context menu or swipe-to-delete

**Tapping behaviour (mobile):** opens URL in in-app browser (`expo-web-browser` / `Linking.openURL`).

---

### 7.3 Folder Card

**Layout:** Horizontal compact card.

```
┌───────────────────────────────────────┐
│  [📁 icon]  Folder Name           ⋯  │
└───────────────────────────────────────┘
```

**Card state:**
- Normal: `bg-surface-primary border-border-primary hover:border-accent-primary/40 hover:shadow-accent-primary/5`
- Vault: `bg-violet-950/20 border-violet-800/30 hover:border-violet-600/50 hover:shadow-violet-900/20`

**Icon container:** 40×40px rounded-lg
- Normal: `bg-accent-primary/15 border border-accent-primary/20`, cyan folder icon
- Vault: `bg-violet-500/20 border border-violet-500/30`, violet folder icon

**Folder name:** 14px semibold, foreground, truncated.

**Action buttons** (visible on hover / long-press on mobile):
1. **Rename** (pencil icon): enters inline edit mode — replaces name text with an input field. Submit on blur or Enter, cancel on Escape. Error shown inline if name is empty.
2. **Delete** (trash icon): shows a confirmation dialog "Delete folder '[name]' and all its contents?" before deleting. Uses `confirm()` on web; use `Alert.alert` on mobile.

**Inline rename:**
- Input styled same as other inputs: `bg-surface-secondary border border-border-primary rounded text-sm`
- Error state: `border-red-500/60`
- Error message: `text-xs text-red-400`

**Grid layout:**
- Web: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`
- Mobile: 2 columns, equal width

**Tap → navigate into folder** (sets `currentFolderId`).

---

### 7.4 Breadcrumb Navigation

Displays the current folder path and allows navigating back.

```
🏠 Home  >  Travel  >  Europe
```

or in vault mode:

```
🔒 Private Vault  >  Finance  >  Crypto
```

**Root label:**
- Normal: "Home" with house icon
- Vault: "Private Vault" with padlock icon

**Each item:**
- Non-active: `text-foreground/50` with hover state
- Active (last item): `text-foreground` / vault: `text-violet-300`, semibold
- Separator: chevron right, `text-foreground/30`

**Behaviour:** Clicking any breadcrumb item navigates to that folder. Clicking root navigates to `currentFolderId = null`.

**Mobile:** Horizontally scrollable with no visible scrollbar (`scrollbar-none`). May need `FlatList` horizontal or `ScrollView` horizontal.

---

### 7.5 Search & Filtering

**Search input:**
- Full width, left-padded 36px for search icon
- Placeholder: "Search in this folder…" or "Search all subfolders…" based on recursive mode
- Clear button (X) appears when input has content (absolute right-3)
- Debounced: 250ms delay before querying
- Normal mode focus: `border-accent-primary/60 ring-accent-primary/20`
- Vault mode focus: `border-violet-500/60 ring-violet-500/20`

**Recursive search toggle:**
- Small button next to search input
- Off: "This folder" label, muted style
- On: "Recursive" label, accent style (normal: cyan, vault: violet)
- Resets to off when navigating to a new folder

**Tag filter pills:**
- Horizontally scrollable row, no scrollbar
- "Filter:" label (shrink-0, foreground/50)
- "All" pill (always first): active when `selectedTag === null`
- One pill per unique tag: `#tagname` format
- Active pill: solid accent colour background (`bg-accent-primary text-background` or vault variant)
- Inactive pill: `bg-surface-secondary text-foreground/60`

**Search result count:**
- Shown when search query or tag filter is active
- Format: "N result(s) for 'query'" or "N result(s) tagged #tag"
- If recursive: appends " (all subfolders)"

**State resets:**
- `selectedTag` and `search` reset to empty on folder navigation (when `currentFolderId` changes)
- Tag filter resets on folder navigation

---

### 7.6 Add Link Flow

Opened as a **bottom sheet modal** (slides up from bottom on mobile).

**Multi-URL batch support:** The user can paste multiple URLs at once.

#### Step 1: URL Input Screen

Shown only when no URLs have been added yet.

- **Textarea** (3 rows): "Paste or type URLs... (one per line or all at once)"
- **Paste handler**: auto-parses pasted text, extracts all URLs, immediately proceeds
- **Enter key**: parses and adds URLs from input
- **URL parsing:** regex-based, extracts `http://`, `https://`, and bare domains like `github.com`. Deduplicates. Prepends `https://` if no protocol.
- **URL chips preview**: shows parsed URLs as removable chips (`bg-accent-primary/10 border-accent-primary/30 rounded-md text-xs text-accent-primary`)
- **Clear button**: appears top-right of textarea when non-empty

#### Step 2: Link Details Form (per URL)

After URLs are added, this form appears for each URL in sequence.

**Header:** "Save Link 1 of N" (shows multi-link progress)

1. **URL display** (read-only): truncated in a styled div
2. **Metadata preview card** (if fetch succeeded):
   - 16:9 thumbnail (if image exists)
   - Favicon + hostname row + green ✓ "Loaded" badge
3. **Metadata error banner** (if fetch failed): amber warning "Could not load preview — fill in details manually."
4. **Fetching state**: implied loading (no explicit skeleton, just absence of preview card)
5. **Title** input: pre-filled from OG title. Required — save button disabled if empty.
6. **Description** textarea (2 rows): optional, pre-filled from OG description
7. **Tags** (TagSelector component — see §7.8)

**Auto-tag behaviour:** On successful metadata fetch, the domain is auto-added as a tag (e.g., `github.com` → `github` tag).

**Footer buttons:**
- **Cancel**: closes modal (or "Close" if no URLs added)
- **Save & Next** / **Save & Done**: saves current link, advances to next, or closes if last
- Save button disabled when `title` is empty or `saving` is true
- Saving state: spinner + "Saving..." text

**Tags persist between links in batch mode** (convenient for related URLs).

**Metadata auto-fetch:** Triggered automatically as soon as a URL is focused/selected in batch mode. Uses `useAction(api.metadata.fetchUrlMetadata)`.

---

### 7.7 Create Folder Modal

Simple single-input dialog.

```
┌──────────────────────────────┐
│  New Folder                  │
│  [________________________]  │
│     Cancel     |   Create    │
└──────────────────────────────┘
```

- Auto-focuses input on open
- Escape closes (mobile: swipe down or tap outside)
- Empty name → disabled submit button
- Error displayed if creation fails
- Created in current folder context (passes `parentId`, `isVault`, `vaultToken`)

---

### 7.8 Tag Selector

A combobox-style multi-select tag input with autocomplete.

**Layout:** A flex-wrap container that looks like an input field, containing selected tag chips and a text input.

**Selected tags:** rendered as chips inside the input area:
- Style: `bg-accent-primary/15 text-accent-primary border border-accent-primary/30 rounded-md text-xs px-2 py-0.5`
- Vault variant: violet colours
- Each chip has an ✕ remove button

**Autocomplete dropdown:**
- Shows `availableTags` filtered by search string (excludes already-selected)
- Each option: `#` prefix, foreground/60 | tag name, foreground
- "Add #newtagname" option at bottom when typed tag doesn't exist (with + icon)

**Keyboard shortcuts (web):**
- **Enter / comma**: selects first filtered tag or creates new one
- **Backspace** (when input empty): removes last selected tag
- **Escape**: closes dropdown

**Tag normalisation:** client-side `name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")`

**Hint text:** "Type to search or create tags · Enter to select"

**Mobile implementation:** Use a custom bottom-sheet tag picker or a flat-list-based autocomplete input.

---

### 7.9 Private Vault

A completely separate, password-protected space for links and folders.

**Visual differentiation when vault is active:**
- Background changes from `#0f0f12` to `#0d0d12`
- All borders/accents shift from cyan → violet
- Vault info banner appears below header: violet strip
- Tab bar active tab: violet border and text
- All folder cards: violet icon and border
- All tag pills and accents: violet
- Add Link button: `from-violet-600 to-purple-600`

**Authentication flow:**

```
hasVault === undefined → loading, button disabled
hasVault === false → Setup modal (create password)
hasVault === true && !vaultUnlocked → Unlock modal (enter password)
hasVault === true && vaultUnlocked → switch to vault immediately
isVaultMode === true → show vault contents
```

**Vault Setup Modal:**
- Violet padlock icon (40×40px)
- "Set Up Private Vault" title
- "Create a password for your private vault" subtitle
- Password input (with show/hide toggle)
- Confirm password input
- Validation: min 8 chars, passwords must match
- Submit: "Create Vault" → violet button
- On success: receives session token, enters vault mode

**Vault Unlock Modal:**
- "Unlock Private Vault" title
- "Enter your vault password to continue" subtitle
- Password input (with show/hide toggle)
- Error: "Incorrect password" in red
- Submit: "Unlock" → violet button
- On success: receives 24-hour session token

**Session token storage:** Kept in React state on web (lost on refresh = re-login required). On mobile, can optionally be stored in `expo-secure-store` for session persistence within the 24h TTL.

**Lock / exit vault:** Clicking "My Links" tab calls `invalidateVaultSession({ token })`, clears all vault state, and resets `currentFolderId` to null.

**Important security notes:**
- The vault token must be passed to every vault query/mutation.
- Vault contents never appear in normal space queries (server-side space filter).
- Session expires after 24 hours of creation (not sliding).

---

### 7.10 Empty States

Shown when no folders AND no links are present in current view.

**No filters active (fresh folder/root):**

Normal mode:
- Large stacked-box icon (or similar illustrative icon)
- "Nothing stashed here yet"
- "Start by adding your first link above." (or via button on mobile)
- Styled: icon `text-foreground/15`, text `text-foreground/40`, subtext `text-foreground/30`

Vault mode:
- Lock icon
- "Your vault is empty"
- "Add private links here — they stay hidden from search."

**Search/filter active with no results:**
- Search icon
- "No links match" title
- "Try a different search or tag." subtitle

---

### 7.11 Loading Skeletons

Grid of 6 skeleton cards while data loads.

Each skeleton card:
- Same dimensions as a link card
- `bg-surface-secondary border border-border-primary rounded-lg overflow-hidden animate-pulse`
- Inner: 16:9 `aspect-video bg-surface-tertiary` + 12px padding + 3 stacked rounded bars of varying widths

---

### 7.12 Error Boundary

`ErrorBoundary` component wraps the main content. On error:
- Shows a generic error UI with a retry option
- Does not expose error details to user

---

## 8. Screen Inventory (Mobile)

Map each web section to a mobile screen / bottom-sheet:

| Screen | Web equivalent | Notes |
|---|---|---|
| **Sign In** | `/sign-in` | Clerk hosted UI or custom with Clerk hooks |
| **Sign Up** | `/sign-up` | Clerk hosted UI or custom |
| **Home** (My Links) | `page.tsx` root view | Stack navigator root |
| **Folder View** | Same page, `currentFolderId` set | Push same screen with folderId param |
| **Vault Unlock** | VaultModal (unlock) | Modal screen or bottom sheet |
| **Vault Setup** | VaultModal (setup) | Modal screen or bottom sheet |
| **Vault Home** | Same as Home, vault mode | Separate tab or toggle on Home tab |
| **Add Link** | AddLink component | Bottom sheet (slides up) |
| **Create Folder** | CreateFolderModal | Small modal or action sheet |
| **Link Detail** | n/a (web opens in new tab) | In-app browser or native share |
| **Search** | Inline in home screen | Dedicated search screen (optional) |
| **Profile / Settings** | Clerk UserButton popover | Separate screen |

**Recommended Navigation Structure (Expo Router or React Navigation):**

```
(tabs)/
  index.tsx          ← My Links (Home)
  vault.tsx          ← Private Vault
  add.tsx            ← Add Link (FAB opens bottom sheet)
  profile.tsx        ← User profile + settings
(stack)/
  folder/[id].tsx    ← Folder contents (reuses Home screen layout)
(modals)/
  vault-unlock.tsx
  vault-setup.tsx
  create-folder.tsx
```

---

## 9. Mobile App Architecture

### State Management

The web app uses local React state. For mobile:

```
Component state:
  - currentFolderId (navigation param instead)
  - isVaultMode (global context or Zustand)
  - vaultToken (SecureStore + context)
  - search (component state)
  - selectedTag (component state)
  - searchRecursive (component state)
  - showAddLink / showCreateFolder (navigation instead)
```

### Convex Integration

Same hooks work in React Native:

```ts
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// Example
const links = useQuery(api.links.getLinks, { folderId, isVault, vaultToken });
const addLink = useMutation(api.links.addLink);
const fetchMetadata = useAction(api.metadata.fetchUrlMetadata);
```

### Vault Token Persistence

```ts
import * as SecureStore from "expo-secure-store";

// Store
await SecureStore.setItemAsync("vault_token", token);
await SecureStore.setItemAsync("vault_token_expires", String(expiresAt));

// Restore
const token = await SecureStore.getItemAsync("vault_token");
const expires = await SecureStore.getItemAsync("vault_token_expires");
if (token && expires && Number(expires) > Date.now()) {
  setVaultToken(token);
  setVaultUnlocked(true);
}
```

### URL Opening

```ts
import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

// In-app browser (preferred)
await WebBrowser.openBrowserAsync(url);

// External browser
await Linking.openURL(url);
```

---

## 10. Mobile-Native Features to Add

These features are native to mobile devices and don't exist in the web app.

### 10.1 Share Sheet Integration (Priority: Critical)

Allow users to share any URL from any app (browser, social media, etc.) directly to Stashly.

**iOS:** Share Extension + Intents
**Android:** Intent filters

With Expo:
```ts
// expo-share-intent or react-native-share-menu
// Receives the shared URL, opens Add Link bottom sheet pre-filled
```

Implementation:
- Register URL MIME type intent in `app.json`
- On app launch, check for shared URL payload
- Pre-fill the URL in the Add Link form
- Allow user to select folder, tags, then save

### 10.2 Biometric Authentication for Vault (Priority: High)

Replace (or supplement) password unlock with Face ID / Touch ID / Fingerprint.

```ts
import * as LocalAuthentication from "expo-local-authentication";

const result = await LocalAuthentication.authenticateAsync({
  promptMessage: "Unlock Private Vault",
  fallbackLabel: "Use Password",
});

if (result.success) {
  const storedToken = await SecureStore.getItemAsync("vault_token");
  // restore vault session
}
```

- Store vault password encrypted with biometric-protected key (via `expo-secure-store` with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`)
- On successful biometric auth, retrieve stored password, call `verifyVaultPassword`
- Fallback to password entry if biometrics fail or aren't enrolled

### 10.3 Offline Support (Priority: Medium)

Convex provides real-time sync. Add offline reading capability:

- Cache link list in `AsyncStorage` or `expo-sqlite`
- Show stale data with an "Offline" indicator
- Queue mutations (add/delete) when offline, sync when connected
- Use `NetInfo` from `@react-native-community/netinfo`

### 10.4 Push Notifications (Priority: Low–Medium)

Optional: Notify users about:
- "You've saved 100 links — time to organise!" milestones
- Reminders to revisit unread/old links
- (Future) Collaborative sharing notifications

```ts
import * as Notifications from "expo-notifications";
// Register device token with Convex via a custom mutation
```

### 10.5 Widget (iOS/Android) (Priority: Low)

Home screen widget showing:
- Recent N links
- Quick-add button that opens share sheet
- Today's stash count

Use `expo-widgets` (iOS 16+ WidgetKit) or `react-native-android-widget`.

### 10.6 Haptic Feedback (Priority: High — UX)

Add haptic feedback for key interactions:

```ts
import * as Haptics from "expo-haptics";

// On delete confirm: warning haptic
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

// On save success: success haptic
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// On link press: light impact
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// On vault unlock: medium impact
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

### 10.7 Swipe Gestures on Cards (Priority: High — UX)

Replace hover-only delete button with swipe-to-delete on link cards:

```ts
import Swipeable from "react-native-gesture-handler/Swipeable";

// Swipe left → reveals delete action (red bg, trash icon)
// Swipe right → reveals "open in browser" action
```

Use `react-native-gesture-handler` + `react-native-reanimated`.

### 10.8 Drag-to-Reorder (Priority: Low)

Allow reordering links or folders via long-press drag.

```ts
import DraggableFlatList from "react-native-draggable-flatlist";
```

Note: Requires adding an `order` field to the Convex schema and a `reorderLinks` mutation.

### 10.9 Camera / QR Code Scanner (Priority: Medium)

Scan a QR code to add a URL:

```ts
import { CameraView, useCameraPermissions } from "expo-camera";
// Detect QR codes → extract URL → open Add Link sheet
```

### 10.10 Clipboard Auto-detect (Priority: Medium)

When app comes to foreground, detect if clipboard contains a URL:

```ts
import * as Clipboard from "expo-clipboard";
import { AppState } from "react-native";

AppState.addEventListener("change", async (state) => {
  if (state === "active") {
    const text = await Clipboard.getStringAsync();
    if (isUrl(text) && text !== lastClipboardUrl) {
      // Show a toast/banner: "URL detected — Save to Stashly?"
    }
  }
});
```

### 10.11 In-App Browser with Read Mode (Priority: Medium)

```ts
import * as WebBrowser from "expo-web-browser";

await WebBrowser.openBrowserAsync(url, {
  presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  toolbarColor: "#0f0f12",
  controlsColor: "#06b6d4",
  readerMode: true, // iOS only
});
```

### 10.12 Link Preview on Long Press (Priority: Medium)

iOS 3D Touch / Android long-press → peek at website without opening:
- Show a preview card with the OG image, title, description
- Actions: Open, Copy URL, Delete, Move to Folder

### 10.13 Siri Shortcuts / App Intents (Priority: Low)

```ts
// expo-apple-authentication / SiriKit
// "Hey Siri, save this page to Stashly"
// "Hey Siri, search Stashly for GitHub"
```

### 10.14 App Lock / Screen Protection (Priority: Medium)

Blur app content when it moves to background (to prevent vault content appearing in app switcher):

```ts
import { AppState } from "react-native";
import { activateKeepAwakeAsync } from "expo-keep-awake";

// On background: show blur overlay
// On foreground with vault open: re-authenticate
```

### 10.15 Pull-to-Refresh (Priority: High — UX)

```tsx
<FlatList
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refetch}
      tintColor="#06b6d4"
    />
  }
/>
```

Convex auto-updates in real-time, but pull-to-refresh is a familiar mobile UX pattern.

### 10.16 Deep Linking (Priority: Medium)

```
stashly://folder/:id        → Open specific folder
stashly://vault             → Open vault (triggers auth)
stashly://add?url=...       → Open add link sheet with URL
```

Configure in `app.json`:
```json
{
  "expo": {
    "scheme": "stashly",
    "intentFilters": [
      { "action": "VIEW", "data": [{ "scheme": "stashly" }] }
    ]
  }
}
```

### 10.17 Local Search with FlatList (Performance)

For large link collections, implement local fuzzy search using a library like `fuse.js` on the cached data before querying Convex.

---

## 11. Environment Variables

### Web (`.env.local`)

```bash
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://xxx.convex.site
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
CLERK_JWT_ISSUER_DOMAIN=https://xxx.clerk.accounts.dev
```

### Mobile (`.env` via `expo-constants` / `eas.json`)

```bash
EXPO_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

> Note: `EXPO_PUBLIC_` prefix makes vars available client-side in Expo. Never expose secret keys.

---

## 12. Recommended Expo/RN Dependencies

```json
{
  "dependencies": {
    "convex": "^1.34.1",
    "@clerk/expo": "latest",
    "expo": "^52.0.0",
    "expo-router": "^4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-web-browser": "~14.0.0",
    "expo-clipboard": "~7.0.0",
    "expo-local-authentication": "~16.0.0",
    "expo-haptics": "~14.0.0",
    "expo-camera": "~16.0.0",
    "expo-notifications": "~0.29.0",
    "expo-linking": "~7.0.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "@react-native-community/netinfo": "^11.0.0",
    "@expo/vector-icons": "^14.0.0",
    "react-native-svg": "15.9.0",
    "@gorhom/bottom-sheet": "^5.0.0",
    "react-native-draggable-flatlist": "^4.0.2"
  }
}
```

### Key Library Notes

- **`@gorhom/bottom-sheet`**: Use for Add Link, Create Folder, Vault modals. Replaces web fixed-position overlays with proper native bottom sheets with snap points.
- **`expo-router`**: File-based routing for Expo (v4+). Use `(tabs)` layout for bottom navigation, `(stack)` for folder drill-down, and modal screens for overlays.
- **`react-native-reanimated` + `react-native-gesture-handler`**: Required for smooth animations and swipe gestures. Must be installed and configured in `babel.config.js`.
- **`expo-local-authentication`**: Biometric vault unlock. Check `hasHardwareAsync()` and `isEnrolledAsync()` before offering biometric option.
- **`@clerk/expo`**: Provides `useAuth`, `useUser`, `SignedIn`, `SignedOut`, `useSignIn`, `useSignOut` hooks. Use `<SignIn />` and `<SignUp />` hosted UI or build custom screens with the hooks.

---

## Appendix — Convex `tokenIdentifier` vs `subject`

**Critical:** All Convex tables use `identity.tokenIdentifier` (not `identity.subject`) as the user scoping field. When querying or mutating, always use `tokenIdentifier`. This is set in all server-side handlers:

```ts
const identity = await ctx.auth.getUserIdentity();
// Use: identity.tokenIdentifier
// NOT: identity.subject
```

This ensures correct scoping across all tables (`links`, `folders`, `tags`, `vaultSettings`, `vaultSessions`).
