# plattform

An open-source, self-hostable workspace for creators — Drive, Notes, Docs, and Link in Bio, powered by Clerk, Supabase, and Liveblocks.

> Built with Next.js 16 · TypeScript · Tailwind CSS 4

---

## What you get

| Module | What it does |
|---|---|
| **Drive** | File storage with BYOK (Bring Your Own R2 / S3 bucket), upload links, sharing |
| **Notes** | Real-time collaborative stream notes via Liveblocks |
| **Docs** | Rich-text documents with image and PDF support |
| **Link in Bio** | Public profile page under your own domain |
| **Dub** | Link shortening and QR codes via Dub OAuth (optional) |

---

## Prerequisites

You need accounts for the following services. All have free tiers.

### Required

**[Clerk](https://clerk.com)** — Authentication  
Create an application, enable email/password sign-in, and copy the API keys.

**[Supabase](https://supabase.com)** — Database  
Create a project. The app uses Postgres with Row Level Security (RLS). You'll need the URL, anon key, and service role key. The `CLERK_JWT_KEY_BASE64` is used to verify Clerk JWTs inside Supabase RLS policies — see the [Clerk + Supabase guide](https://clerk.com/docs/integrations/databases/supabase).

**[Liveblocks](https://liveblocks.io)** — Real-time (Notes & Docs)  
Create a project and copy the public and secret keys.

### Optional

**[Dub](https://dub.co)** — Link shortening  
Register an OAuth app at `app.dub.co/oauth`. Set the redirect URI to `https://your-domain.com/api/integrations/dub/callback`. Each workspace connects their own Dub account via OAuth — no global API key needed.

**Cloudflare R2 / S3-compatible storage** — Drive BYOK  
You can set a global fallback bucket via env vars, or let each workspace connect their own bucket via Settings → Drive Storage. No account needed to run the app — Drive just won't work until storage is configured.

---

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in your values.

```bash
# ── Auth (Clerk) ───────────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_JWT_KEY_BASE64=...          # base64-encoded PEM public key for Supabase RLS

# ── Database (Supabase) ────────────────────────────────────────────────────
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ENCRYPTION_KEY=...                # 32-byte hex string — encrypts BYOK credentials at rest

# ── Real-time (Liveblocks) ────────────────────────────────────────────────
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_...
LIVEBLOCKS_SECRET_KEY=sk_...

# ── Link shortening (Dub — optional) ──────────────────────────────────────
DUB_CLIENT_ID=...
DUB_CLIENT_SECRET=...

# ── Drive fallback storage (optional — workspaces can also use BYOK) ──────
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_BASE_URL=https://...

# ── Branding ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_BRAND_NAME=plattform  # shown in title, onboarding, footer

# ── App URL ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Generate `ENCRYPTION_KEY` with:

```bash
openssl rand -hex 32
```

---

## Getting started

```bash
# 1. Clone
git clone https://github.com/your-org/plattform.git
cd plattform

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.local.example .env.local
# → fill in your values

# 4. Run database migrations
# Apply the SQL files in supabase/migrations/ to your Supabase project

# 5. Start dev server
pnpm dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

---

## Drive BYOK (Bring Your Own Bucket)

Each workspace connects its own Cloudflare R2 bucket (or any S3-compatible provider) via **Settings → Drive Storage**. Credentials are encrypted with AES-256-GCM using `ENCRYPTION_KEY` before being stored in Supabase.

You can alternatively set a shared fallback bucket for all workspaces using the `R2_*` env vars — useful for self-hosted single-tenant setups.

---

## Branding

Set `NEXT_PUBLIC_BRAND_NAME` in `.env.local` to replace "plattform" with your own name throughout the UI.

Each workspace can also set a **brand color** and **logo** in Settings → Workspace — the color is applied as a CSS variable (`--brand`) across the sidebar.

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + oklch color tokens |
| Auth | Clerk |
| Database | Supabase (Postgres + RLS) |
| Real-time | Liveblocks |
| Storage | Cloudflare R2 / S3-compatible (BYOK) |
| Icons | Hugeicons Pro |

---

## License

[PolyForm Noncommercial 1.0.0](LICENSE) + Individual Creator Grant.

**Free to use if you are:**
- A developer, researcher, or hobbyist using it non-commercially
- An individual creator self-hosting for your own workspace (YouTube, streaming, content business) — as long as you don't offer it as a service to others

**Requires a commercial license if you are:**
- An agency deploying this for clients
- Building a hosted product or SaaS on top of this
- Operating in a way that competes directly with [oxom.de](https://oxom.de)

Commercial licensing → [info@oxom.de](mailto:info@oxom.de)
