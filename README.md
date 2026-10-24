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
| `NEXT_PUBLIC_SITE_URL` | all | Public site URL, used in sign-up emails |

Without the Supabase values the site still builds and shows a notice that the
catalogue isn't connected yet instead of products.

### Local Supabase

```bash
npx supabase start        # applies migrations and supabase/seed.sql
npx supabase status -o env
```

Use the printed `API_URL` and `ANON_KEY` in `.env.local`. Email confirmation is
off locally, so sign-ups are signed in straight away.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript |
| `npm test` | Unit tests (Vitest): bag logic, checkout validation, money, stock, redirects |
| `npm run test:db` | Database tests against `DATABASE_URL`: RLS, pricing, idempotency, stock, and a concurrent last-unit race |
| `npm run test:e2e` | Browser tests (Playwright) against a running build backed by a **local** Supabase. They create accounts and place orders, so never point them at production. |

`scripts/local-stack.sh` runs Supabase Auth and PostgREST without Docker for
environments that can't pull containers. CI uses `supabase start`.

## Sample data

`supabase/seed.sql` adds four fictional brands (Dewlune, Rosel Atelier,
Mochéra, Peachline Lab) and twelve products, all flagged `is_sample` and shown
with a "Sample" badge. Remove them before launch; the seed file's header has
the SQL.

## Going live

1. Import this repository in Vercel and add the three environment variables
   for Production and Preview.
2. In Supabase, Authentication, URL configuration: set the Site URL to the
   production domain and add `https://<domain>/auth/callback` (plus preview
   URLs if wanted) to the redirect allow list.
3. Set the real delivery fee, free-delivery threshold and per-item limit in
   `public.store_settings`.
4. Add staff: after they sign up, insert their user id into `public.staff`
   (`insert into public.staff (user_id) values ('<uuid>');` in the SQL editor).
5. Replace the sample catalog with real brands and products, and upload
   product photography to Supabase Storage.
6. Configure a custom SMTP sender in Supabase so confirmation emails come from
   the store's domain.

Not built yet: an admin dashboard (staff currently manage catalog and order
status in Supabase), email order confirmations, and returns handling.
