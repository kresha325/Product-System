# Product System

Production-style **React + Vite** catalog and admin UI where **GitHub is the storage layer**: `data/products.json`, `data/businesses.json`, images under `public/images/`, and generated **static JSON APIs** under `public/api/` (no separate database).

## Features

- Public: `/products`, `/product/:slug`, `/businesses`, business filter via query or route.
- Admin: username/password gate, multi-tenant **business ownership**, product CRUD with **WebP** gallery, optional per-business product fields.
- Static API (after each save): business bundle, per-category JSON, **index** with all endpoint URLs, businesses index.
- **Audit trail** (`data/audit.json`) on product/business writes (last ~150 events).
- Admin: **export** visible products as JSON, **import** array (skips duplicates / unauthorized businesses), **drag to reorder** gallery images, limits on image count/size.

## Security

See [docs/SECURITY.md](docs/SECURITY.md). The GitHub token in the client build is convenient but **not** enterprise-grade; plan to move writes server-side for production customers.

## Environment variables

Copy `.env.example` to `.env` locally. For **GitHub Pages** builds, set **repository secrets** and pass them in `.github/workflows/deploy-pages.yml` (already wired).

| Variable | Purpose |
|----------|---------|
| `VITE_GITHUB_TOKEN` | PAT with repo **Contents: Read and write** |
| `VITE_GITHUB_OWNER` / `VITE_GITHUB_REPO` | Target repository |
| `VITE_SUPERADMIN_USERNAME` / `VITE_SUPERADMIN_PASSWORD` | Super-admin login |
| `VITE_ADMIN_CREDENTIALS` | `user:pass,user2:pass2` for normal admins |

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy (GitHub Pages)

1. Repo **Settings → Pages → Source: GitHub Actions** (not “Deploy from branch”).
2. Use **only** [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) — it uploads the Vite **`dist`** output.
3. Secrets: `VITE_GITHUB_TOKEN`, `VITE_SUPERADMIN_USERNAME`, `VITE_SUPERADMIN_PASSWORD`, `VITE_ADMIN_CREDENTIALS`.

> **Removed:** the old workflow that uploaded the whole repository root as the site (that caused `/src/main.jsx` 404 on Pages).

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs `npm run lint` and `npm run build` on pushes and pull requests to `main`.

## API — how to call a business

Replace `BASE` with your Pages origin + repo path, e.g. `https://kresha325.github.io/Product-System`.

| Resource | URL pattern |
|----------|-------------|
| All businesses | `{BASE}/api/businesses.json` |
| Business bundle (products + meta) | `{BASE}/api/{businessSlug}.json` |
| **Index (links to all endpoints)** | `{BASE}/api/{businessSlug}/index.json` |
| Products mirror | `{BASE}/business/{businessSlug}/products.json` |
| Category filter | `{BASE}/api/{businessSlug}/category/{categorySlug}.json` |

Raw GitHub URLs (good for programmatic access) follow `getRawRepoUrl` in `src/utils/github.js` (see `API_SCHEMA_VERSION` in payloads).

JSON shape for bundles is described in [docs/api-business-bundle.schema.json](docs/api-business-bundle.schema.json). Payloads include `schemaVersion` (integer); bump when you change shape.

## Routing

The app uses **hash routing** (`#/products`, `#/admin`) so GitHub Pages works without SPA server rewrites.
