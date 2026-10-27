# Testing

| Suite | Tool | Location | Command |
| --- | --- | --- | --- |
| Shared unit tests | Vitest | `packages/shared/src/*.test.ts` | `npm test --workspace=@shayara/shared` |
| API integration tests | Vitest + Supertest | `apps/api/src/**/*.test.ts` | `npm test --workspace=@shayara/api` |
| Web unit tests | Vitest | `apps/web/src/**/*.test.ts` | `npm test --workspace=@shayara/web` |
| End to end | Playwright | `apps/web/e2e/*.spec.ts` | `npm run test:e2e` |

`npm test` at the root runs all three Vitest suites. `npm run check` runs lint, typecheck, tests and builds.

## Isolation and safety

- **API tests** start a throwaway in-memory MongoDB **replica set** (`mongodb-memory-server`, via `src/tests/global-setup.ts`), and each test file gets its own randomly named database. They never read `apps/api/.env`, never touch a real database and use the test-only mock payment gateway and in-memory mailer. The first run downloads a `mongod` binary of roughly 800 MB, which is then cached.
- **End-to-end tests** start their own stack (`playwright.config.ts`): `apps/api/scripts/e2e-server.ts` (in-memory database seeded with the sample catalogue and an e2e admin, mock payments) on port 4100, and a production build of the web app on port 3100. Run `npx playwright install chromium` once. Rebuild the web app with `npm run build` afterwards, because the e2e build points at the e2e API.
- API test files run **one at a time** (about a minute in total). With parallel workers on Windows the runner intermittently died with a native fail-fast (`0xC0000409`) during worker teardown. It did not reproduce outside the runner, and sequential runs passed consistently. In-app concurrency is still tested explicitly (parallel checkouts, duplicate webhooks).

## What is covered

**API (106 tests)**

- **Auth:** registration, Argon2id hashing, duplicate emails, password policy, same error for unknown email and wrong password, session rotation and cookie flags, token hashing, logout invalidation, password change signing out other devices, reset tokens (single use, no enumeration), email verification, disabled accounts.
- **Security:** CSRF (missing token, another session's token, foreign origin), CORS, security headers, mass-assignment rejection (`role` on register and profile), 401/403 on protected and admin routes, immediate role revocation.
- **Catalogue:** published-only visibility, filters (type, finish, price, stock), all sorts including the top-rated minimum review count, pagination, query validation, search (full words, keywords, partial words, regex injection), collections with honest fallback, category counts.
- **Admin products:** create with slug generation, duplicate SKU, invalid or fractional prices, publish-needs-image, blocked rating, sales and stock edits, image ordering, media host allowlist and tracked keys, media release on removal, atomic stock adjustments with audit, archive vs delete.
- **Media:** upload authorization (missing, forged or tampered tokens; customers; role revoked after token issue), admin-only token endpoint, "not configured" responses.
- **Cart:** guest cart persistence and merge at login, cross-session persistence, quantity and stock validation, unpublished products, client price fields rejected, size selection, price and stock change flags.
- **Checkout:** server-side totals (shipping, free-shipping threshold, COD fee), price snapshots, client totals ignored, stale expected total, idempotency-key replay, concurrent double-submit, **concurrent customers never overselling** (with and without transactions), foreign addresses, COD confirmation and sales counting, **reservation expiry releasing stock exactly once**, customer cancellation, order isolation between users.
- **Payments:** checkout and webhook signature helpers, provider order reuse, paid only after a verified signature plus a captured payment, forged signatures, delayed capture completed by webhook, capture of authorized payments, amount mismatch flagged, failed attempt then success, other users blocked, invalid webhook signatures, **duplicate webhook events processed once**, out-of-order failure after success, duplicate payment auto-refund, unknown events, reconciliation before expiry, late payment reinstating or auto-refunding, partial and full refunds with webhook reconciliation and no regression, failed refund flagging, refund on cancellation of a paid order.
- **Reviews and admin orders:** verified purchase (delivered only), one review per product, moderation, aggregates on approve and edit, rating validation, ownership, fulfilment transitions, tracking requirement, COD collection, return window, restock on return, dashboard metrics, customers blocked from admin actions.
- **Config:** starts without integrations, clear missing-variable errors, mock gateway and insecure production settings refused, payment-not-configured handling, health and error formats.

**End to end (Playwright, 10 tests)**

- Homepage on mobile with no horizontal overflow.
- Filters and sort in the URL and stable across reload.
- Search.
- Product SEO: title, canonical and JSON-LD with real price and stock.
- 404 status for unknown products.
- Private pages redirect and send noindex.
- **Full journey:** a guest bag survives registration; checkout with a new address and COD (server total checked); admin ships and delivers with tracking and cash collection; customer sees tracking and writes a review; admin approves; the review appears on the product page with a verified badge.
- Customers blocked from admin.
- Admin creates and publishes a product, previews it with the shared product component, and sees it in the store with admin controls.

## Not automated

- **Real Razorpay Checkout in a browser.** It needs Razorpay test keys and their hosted modal. Follow [deployment.md §6](deployment.md#6-razorpay-start-in-test-mode) to test it manually.
- **Real UploadThing uploads.** They need a token. Authorization and the media lifecycle are covered with mocks.
