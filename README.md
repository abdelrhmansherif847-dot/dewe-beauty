# DEWÉ BEAUTY

*Your everyday glow* · نضارتك. لمعتك. إنتِ.

A multi-brand beauty store: brands, catalog with per-variant price and stock,
customer accounts, a bag, and checkout with **cash on delivery only**.

Built with Next.js 16 (App Router, Cache Components), TypeScript, Supabase
(Postgres, Auth, row level security) and Motion for React. Deployed on Vercel.

- Design decisions, tokens and motion rules: [docs/design-system.md](docs/design-system.md)
- Database schema and rules: [supabase/migrations](supabase/migrations)

## How it works

- **Catalog pages are cached and shared.** They read through the anonymous
  role, so results can be cached for everyone (`"use cache"`, tag `catalog`,
  about a minute). Placing an order expires the tag.
- **The bag lives in the browser** (localStorage) and only stores what the
  shopper picked. Before checkout it re-reads live prices and stock.
- **Orders are priced by the database.** `public.place_cod_order()` locks the
  variant rows, recomputes every price from the catalog, checks stock,
  decrements it and writes the order in one transaction. Prices sent by the
  browser are ignored. Retries with the same idempotency key return the same
  order instead of creating a second one.
- **Accounts are phone-first.** Customers sign up with an Egyptian mobile
  number and a password through Supabase Auth's phone provider; when phone
  confirmations are on, the account only works after the texted code is
  accepted. Email is optional, stored as a contact field only, and nothing is
  sent to it yet.
- **Guests can check out without an account or email.** A guest order has no
  user; it stores the SHA-256 hash of a random token that only the buyer's
  browser holds (httpOnly cookie, plus a private link they can save).
  `public.get_guest_order()` needs the order id and that token, so an order
  id or number alone reveals nothing.
- **Delivery is per governorate.** `public.delivery_zones` lists the 27
  governorates; checkout refuses inactive ones, and a zone can override the
  default delivery fee.
- **Row level security on every table.** Shoppers can read the active catalog
  and only their own profile and orders. They cannot insert orders directly,
  change prices or stock, or make themselves staff. Staff are listed in
  `public.staff`, checked by `private.is_admin()`.
- **No secret keys in the app.** It only needs the public URL and the
  publishable key.

## Getting started

Requirements: Node 20.9 or newer, and either Docker (for the Supabase CLI) or
a Postgres you can point the scripts at.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

### Environment variables

| Name | Where | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | all | Project URL, e.g. `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | all | Publishable (anon) key from Supabase, API settings |
| `NEXT_PUBLIC_SITE_URL` | optional | Public site URL, used in sign-up emails and metadata. On Vercel it defaults to the production domain (or the branch URL on previews); set it once a custom domain is live. |

Without the Supabase values the site still builds and shows a notice that the
catalogue isn't connected yet instead of products.

### Local Supabase

```bash
npx supabase start        # applies migrations and supabase/seed.sql
npx supabase status -o env
```

Use the printed `API_URL` and `ANON_KEY` in `.env.local`. Phone sign-up works
locally without sending SMS: the numbers in `[auth.sms.test_otp]` of
`supabase/config.toml` (010 0000 0101 to 0103) always receive the code
`246810`. Phone accounts are unique, so restart the stack (and delete `.next`
before building, since the build caches catalog data) before re-running e2e.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript |
| `npm test` | Unit tests (Vitest): bag logic, checkout validation, money, stock, redirects |
| `npm run test:db` | Database tests against `DATABASE_URL`: RLS, pricing, idempotency, stock, and a concurrent last-unit race |
| `npm run test:e2e` | Browser tests (Playwright) against a running build backed by a **local** Supabase. They create accounts and place orders, so never point them at production. |

`scripts/local-stack.sh` runs Supabase Auth (with phone sign-up and fixed test
codes) and PostgREST without Docker for
environments that can't pull containers. CI uses `supabase start`.

## Sample data

`supabase/seed.sql` adds four fictional brands (Dewlune, Rosel Atelier,
Mochéra, Peachline Lab) and twelve products, all flagged `is_sample` and shown
with a "Sample" badge. Remove them before launch; the seed file's header has
the SQL.

## Going live

Everything that still needs a dashboard, a provider account or a decision is
tracked in [docs/launch-checklist.md](docs/launch-checklist.md). The store is
not launch-ready until a real end-to-end order succeeds on the deployed site.

Not built yet: an admin dashboard (staff currently manage catalog and order
status in Supabase), password reset by SMS, email order confirmations, and
returns handling.
