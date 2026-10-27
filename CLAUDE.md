# CLAUDE.md — working on Shayara

npm-workspaces TypeScript monorepo: `apps/api` (Express 5 + Mongoose 9), `apps/web` (Next.js 16 App Router), `packages/shared` (Zod schemas/types consumed as TS source — no build step).

## Commands
- Dev: `npm run db:dev` (local replica set) then `npm run dev`.
- Checks: `npm run lint`, `npm run typecheck`, `npm test` (API tests need ~1 GB disk for the mongod binary on first run), `npm run test:e2e` (production-builds the web app and runs it on :3100 against an isolated in-memory API on :4100; afterwards re-run `npm run build` before deploying, since the e2e build bakes in the e2e API URL).
- Single API test file: `cd apps/api && npx vitest run src/modules/<x>/<x>.test.ts`.

## Rules that matter
- The server is authoritative for prices, totals, stock and payment state. Never accept prices/totals from clients; schemas are `strictObject` to block mass assignment.
- Money is integer **paise** everywhere (API, DB, DTOs). Forms show rupees and convert.
- Every request input goes through a Zod schema from `packages/shared` (`parseBody/parseQuery/parseParams`). Add new fields to the shared schema first.
- Product finish (gold/silver/rose-gold *tone*) and base material are separate; never describe products as solid gold/silver.
- Stock changes must be atomic conditional updates (`stock: {$gte: n}`) — see `modules/orders/inventory.service.ts`. Order state transitions use `findOneAndUpdate` with the expected current state.
- Payments: an order becomes paid only via `markOrderPaid` after a verified signature + provider-confirmed capture or a signed webhook. Webhooks are idempotent (`WebhookEvent` unique index) and need the raw body (mounted before `express.json`).
- The mock payment gateway is test-only (config refuses it outside `NODE_ENV=test`).
- Admin role is never settable via API; use `npm run create-admin`. Every admin route is behind `requireAdmin`, which reads the role from the DB each request.
- Mutating requests need the `x-csrf-token` header (from `GET /auth/me`); signature-authenticated routes (webhook, UploadThing) are mounted before CSRF.
- Next 16: `params`/`searchParams` are Promises; lint enforces React Compiler rules (no setState in effects — use `useApiQuery`, `useHydrated`, derive state).
- Storefront catalogue fetches are tagged `catalogue`; Product model middleware notifies `/api/revalidate` when products change.
- Never commit `.env` files. Never wipe the dev database in `apps/api/.data`.
