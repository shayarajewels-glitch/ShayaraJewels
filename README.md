# Shayara

**Everyday elegance. Your kind of shine.**

Shayara is a full-stack e-commerce store for artificial and fashion jewellery (bracelets, rings, necklaces, pendants and anklets in gold, silver and rose gold tones), aimed at customers aged 18–40 in India.

It started as an MBA final-year project and is built so it can run as a real store once hosting, a domain and the payment, email and media providers are set up. See the [production launch checklist](docs/deployment.md#production-launch-checklist).

| Part | Technology |
| --- | --- |
| Storefront and admin (`apps/web`) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn-style components on Radix, Zustand, React Hook Form + Zod |
| API (`apps/api`) | Node.js, Express 5, TypeScript, Mongoose 9 (MongoDB Atlas), Zod |
| Shared (`packages/shared`) | Zod schemas, types and constants used by both apps |
| Auth | Server-side sessions in MongoDB, HTTP-only cookies, Argon2id, CSRF tokens |
| Payments | Razorpay Standard Checkout (official Node SDK), signed webhooks |
| Media | UploadThing v7 with the Express adapter |
| Tests | Vitest, Supertest, Playwright |

## Quick start (local development)

Prerequisites: **Node.js 22.12+** and npm 10+. You don't need MongoDB, Razorpay or UploadThing accounts to run it locally.

```bash
npm install

# 1. Configure the API and the web app (never commit these files)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
#    In apps/api/.env set:
#      MONGODB_URI=mongodb://127.0.0.1:27017/shayara?replicaSet=rs0
#      SESSION_SECRET=<output of the command below>
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 2. Start a local MongoDB replica set (development only; data kept in apps/api/.data)
npm run db:dev            # leave this running in its own terminal

# 3. Add the sample catalogue and create the first administrator
npm run seed
npm run create-admin -- --email you@example.com --name "Your Name"

# 4. Run the API (http://localhost:4000) and storefront (http://localhost:3000)
npm run dev
```

Then:

- Shop at http://localhost:3000.
- Manage the store at http://localhost:3000/admin.
- In development, emails such as password resets and verification links are printed in the API terminal.

**Without provider credentials**, the app still runs. The API prints which integrations are disabled:

- **Razorpay not configured:** checkout offers Cash on Delivery only, and online-payment calls return a clear `PAYMENT_NOT_CONFIGURED` error.
- **UploadThing not configured:** admins can still attach images by site path, such as `/images/products/…`. Upload endpoints return `UPLOADS_NOT_CONFIGURED`.
- **Email not configured:** the default is `console` in development and `disabled` in production. Nothing is sent and no tokens are logged in production.

## Scripts (repo root)

| Command | What it does |
| --- | --- |
| `npm run dev` | API and web together (watch mode) |
| `npm run db:dev` | Local MongoDB replica set for development |
| `npm run seed` | Adds the sample catalogue (idempotent, never deletes) |
| `npm run create-admin -- --email … --name …` | One-time first-admin bootstrap |
| `npm run lint` | ESLint across the monorepo |
| `npm run typecheck` | TypeScript in every workspace |
| `npm test` | Unit and integration tests (API uses an isolated in-memory MongoDB) |
| `npm run test:e2e` | Playwright end-to-end tests on an isolated stack |
| `npm run build` | Production builds of the API and web |
| `npm run check` | lint + typecheck + test + build |

## Repository layout

```
apps/
  api/            Express API (src/modules/<feature>/ routes + services + tests)
    scripts/      dev-db, seed, create-admin, e2e-server, placeholder generator
  web/            Next.js storefront + admin (src/app/(store), src/app/admin)
    e2e/          Playwright specs
packages/
  shared/         Zod schemas, DTO types, constants (TypeScript source)
docs/             architecture, api, database, deployment, testing
```

## Documentation

- [Architecture and security design](docs/architecture.md)
- [REST API reference](docs/api.md)
- [Database models and indexes](docs/database.md)
- [Deployment](docs/deployment.md): MongoDB Atlas, Razorpay test mode, UploadThing, hosting, launch checklist, backup and recovery
- [Testing](docs/testing.md)

## Before accepting real customers

This repository is the software only. Before going live you need production hosting for both apps, HTTPS on your own domain, a MongoDB Atlas cluster with backups, live Razorpay keys with KYC complete, an SMTP provider, an UploadThing app, and real product photography, prices, stock and legal pages reviewed for your business. See the [launch checklist](docs/deployment.md#production-launch-checklist).

Sample product photos are free Unsplash-licensed images (see [docs/image-credits.md](docs/image-credits.md)). They are stand-ins for real catalogue photography. The original SVG illustrations from `apps/api/scripts/generate-placeholders.ts` are kept for tests.
