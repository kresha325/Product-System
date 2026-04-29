# Product System

Product System is a production-ready React + Vite application where GitHub is the only storage layer.

## Features

- `/admin` page to add products
- Image upload with client-side WebP conversion and compression
- Product data write to `data/products.json` via GitHub REST API
- Image write to `public/images/{slug}.webp` via GitHub REST API
- `/products` page with responsive product cards
- `/product/:slug` page for product details
- No backend and no database

## Environment Variables

Create `.env` from `.env.example` and fill:

```bash
VITE_GITHUB_TOKEN=
VITE_GITHUB_OWNER=
VITE_GITHUB_REPO=
VITE_ADMIN_PASSWORD=
```

Notes:

- `VITE_GITHUB_TOKEN` should have repo content write access.
- The code assumes branch `main` for commit updates.
- `VITE_ADMIN_PASSWORD` mbron rrugen `/admin` me nje password ne frontend.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
