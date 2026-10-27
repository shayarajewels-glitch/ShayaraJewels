# Architecture

## Overview

```
Browser ──HTTPS──▶ Next.js (apps/web)          SSR storefront, admin UI, SEO, sitemap
   │                    │  server-side fetch (public catalogue, cached + tagged)
   │                    ▼
   └──HTTPS + cookie──▶ Express API (apps/api) ──▶ MongoDB Atlas (replica set)
                          │  ▲
                          │  └── Razorpay webhooks (signed, raw body)
                          ├──▶ Razorpay API (orders, payments, refunds)
                          ├──▶ UploadThing (file storage, UTApi deletes)
                          └──▶ SMTP (password reset, email verification)
```

- The **web app never touches MongoDB** and holds no secrets other than the optional `REVALIDATE_SECRET`, which is server-only. It renders public catalogue pages on the server and calls the API from the browser for anything user-specific.
- The **API owns all business logic**: authentication, catalogue, cart, pricing, stock, orders, payments, reviews and media.
- `packages/shared` holds Zod schemas, constants and DTO types, so validation rules and types are identical on both sides.

## API structure

`apps/api/src`:

- `app.ts` builds the Express app. Middleware order matters:
  1. Request id → pino-http logging (with redaction) → Helmet → CORS allowlist.
  2. `/health` routes.
  3. **`/api/v1/webhooks/razorpay` with `express.raw`**, mounted before JSON parsing so the signature is checked against the exact bytes.
  4. **`/api/uploadthing`** (the UploadThing Express adapter reads its own body and uses Bearer upload tokens).
  5. `cookie-parser` → `express.json` (200 kB limit) → session loader.
  6. `/api/v1` → rate limit → CSRF check → feature routers.
  7. 404 → central error handler (safe JSON errors with a request id).
- `config/`: `env.ts` validates environment variables at startup. Required: `MONGODB_URI`, `SESSION_SECRET`. Integration credentials are optional and checked lazily. Insecure production settings, such as the mock gateway, console mail or non-secure cookies, are refused. `db.ts` handles the connection, detects transaction support and provides `withOptionalTransaction`. `logger.ts` sets up pino with redaction.
- `models/`: Mongoose schemas (see [database.md](database.md)).
- `modules/<feature>/`: routes, services, mappers (DTOs) and tests per feature: `auth`, `users`, `addresses`, `products`, `cart`, `checkout`, `orders`, `payments`, `reviews`, `uploads`, `admin`, `health`.
- `jobs/`: in-process interval jobs. They release expired stock reservations (after reconciling with Razorpay) and clean up orphaned uploads. Each step is an atomic, idempotent transition, so running several API instances is safe, just redundant.

## Authentication and sessions

- **Passwords:** Argon2id (19 MiB, t=2, p=1, the OWASP baseline). Hashes are upgraded on login if parameters change. Unknown-email logins still spend comparable hashing time to blunt user enumeration.
- **Sessions** live in MongoDB (`sessions` collection, TTL index):
  - The cookie holds a random 256-bit token; only its SHA-256 is stored.
  - Cookie flags are `HttpOnly`, `SameSite=Lax` and `Secure` in production. With no cookie domain it uses the `__Host-` prefix.
  - Customers get 30 days of sliding expiry; anonymous sessions get 7 days.
- **Rotation:** login and registration issue a new session id and delete the old one (prevents fixation), merging any guest cart. Changing the password signs out every other device. Resetting it signs out all devices.
- **Anonymous sessions** are created only when needed: the CSRF token and guest cart.
- **Roles:** `customer` or `admin`. Admins are created only by `npm run create-admin`, which refuses if an admin already exists. `requireAdmin` reads the role from the database on every request, so revocation is immediate.
- **Password reset and email verification** tokens are 256-bit, stored as SHA-256 hashes, single-use (atomic `usedAt` set), and short-lived (30 min and 48 h). Responses never reveal whether an email exists.

## CSRF and CORS

- CORS reflects only allowed origins (`FRONTEND_URL` plus `CORS_ORIGINS`) and allows credentials.
- Every unsafe `/api/v1` request must:
  1. come from an allowed `Origin`/`Referer` when one is present, and
  2. send `x-csrf-token` equal to `HMAC(SESSION_SECRET, "csrf:" + sessionTokenHash)`. This is a synchronizer token bound to the session, returned by `GET /auth/me` and on login/logout. The custom header also forces a CORS preflight.
- Webhooks and UploadThing use their own signature or token authentication and are mounted before the CSRF check.

## Catalogue, search and SEO

- Listings filter on `status: 'published'` and use compound indexes per sort. Search uses a weighted text index (name, keywords, type, finish, description) and falls back to a word-prefix regex for partial words. Filters live in URL query parameters.
- **Bestsellers** sort by `unitsSold`. It is incremented once when an order is confirmed (paid, or placed as COD) and decremented on cancellation or return.
- **Top rated** sorts by `ratingScore`, which equals `averageRating` only when a product has at least 3 approved reviews, otherwise 0. Ratings are recomputed from approved reviews on every moderation change.
- When there is no sales or review data, the API returns featured products with `fallback: true`, and the storefront labels or hides the rail accordingly.
- **Product pages** are server-rendered with canonical URLs, Open Graph metadata, `Product`/`Offer` JSON-LD (real price and availability; `aggregateRating` only when real reviews exist) and breadcrumbs.
- **Indexing:** filtered and sorted listings are `noindex,follow`. Private routes send `X-Robots-Tag: noindex`, and robots.txt also lists them, though authorization never relies on it. The sitemap lists only published products.
- **Freshness:** catalogue fetches are cached for 60 s and tagged `catalogue`. Product writes trigger a Mongoose post-hook that calls the storefront's `/api/revalidate` (shared secret), so price, stock and review changes appear on the next request.

## Cart, checkout and inventory

- **Carts:** a logged-in user's cart is keyed by user id; a guest's by anonymous session id. Guest carts merge into the account at login, with quantities capped by stock and the per-item limit.
- **Pricing:** every cart and quote response is recomputed from the database. Shipping is free from ₹999, otherwise ₹79. COD adds a ₹49 fee and is available up to ₹5,000. The values are in `packages/shared/src/constants/commerce.ts`.
- **`POST /checkout`** (requires the `Idempotency-Key` header):
  1. Replays the existing order if the key was already used.
  2. Takes a 60-second **cart lock** to block concurrent checkouts of the same cart.
  3. Validates the address (it must belong to the user) and every cart line.
  4. If the client sent `expectedTotalPaise`, rejects with `PRICE_CHANGED` when it differs from the server total.
  5. **Reserves stock atomically** with `updateOne({stock: {$gte: qty}}, {$inc: {stock: -qty}})` per line, inside a transaction when the deployment supports it, otherwise with compensation that restores already-deducted lines.
  6. Creates the order with price and address snapshots and clears the cart.
- **Reservation:** prepaid orders hold stock for `PAYMENT_WINDOW_MINUTES` (default 30). The expiry job first asks Razorpay whether the order was in fact paid, then expires it and returns stock. The `stockReserved` flag makes stock release happen exactly once.

## Payments (Razorpay)

1. The client calls `POST /payments/razorpay/create-order`. The server creates or reuses a Razorpay order for the stored order total and returns only the key id, Razorpay order id and amount.
2. Razorpay Checkout runs in the browser. On success the client sends the three `razorpay_*` fields to `POST /payments/razorpay/verify`.
3. The server verifies `HMAC_SHA256(order_id|payment_id, key_secret)` using the **Razorpay order id it stored**. It then fetches the payment from Razorpay and checks the order id, amount and currency. Authorized payments are captured; only captured payments mark the order paid. The callback alone never fulfils anything.
4. **Webhooks** (`payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.*`) are verified against the raw body. They are de-duplicated by `x-razorpay-event-id` with a unique index, and failed events are retried. State only moves forward; a paid order is never un-paid.
5. **Edge cases:**
   - A failed attempt keeps the order payable.
   - A second successful payment is refunded automatically and the order is flagged.
   - A payment that arrives after expiry reinstates the order if stock allows; otherwise it is refunded automatically.
   - A payment after a customer cancellation is refunded.
6. **Refunds** go through the API (`POST /admin/orders/:id/refund`, or automatically on cancellation of paid orders). `refund.*` webhooks reconcile their status; a processed refund is never regressed, and failed refunds flag the order.

The `MockGateway` (test-only) implements the same interface and is refused by config outside `NODE_ENV=test`.

## Media (UploadThing v7)

- **Routes:** `productImage` (JPEG, PNG, WebP or AVIF; up to 10 files; size set by `MEDIA_MAX_IMAGE_SIZE`) and `productVideo` (MP4 or WebM; size set by `MEDIA_MAX_VIDEO_SIZE`; duration checked in the admin UI against `MEDIA_MAX_VIDEO_SECONDS`).
- **Upload auth:** the browser uploads cross-origin without cookies. Admins fetch a 10-minute HMAC upload token from a CSRF-protected admin endpoint and send it as `Authorization: Bearer`. The UploadThing middleware verifies it and re-checks the admin role in the database.
- **Tracking:** every upload is recorded in `media_assets` as `pending`. Only tracked keys can be attached to products, and media URLs must be site-relative or UploadThing hosts.
- **Cleanup:** removed media is deleted with `UTApi.deleteFiles` unless another product still uses it. Uploads never attached are deleted after 24 h by the cleanup job.

## Logging and errors

- pino structured logs. Cookies, authorization headers, CSRF tokens, passwords, tokens, signatures and secrets are redacted.
- Errors return `{ error: { code, message, details?, requestId } }`. 5xx responses never include internal messages; validation errors list field paths.
