# REST API

Base URL: `${API_BASE_URL}/api/v1`. All bodies are JSON. Money is integer **paise**. Dates are ISO 8601.

**Conventions**

- **Session:** an HTTP-only cookie. Call `GET /auth/me` first; it creates an anonymous session if needed and returns a `csrfToken`.
- **Unsafe methods** (POST, PATCH, DELETE) must send `x-csrf-token: <csrfToken>`. Browsers must send credentials (`fetch(..., { credentials: 'include' })`).
- **Errors:** `{ "error": { "code", "message", "details"?: [{ "path", "message" }], "requestId" } }`.
- **Paginated lists:** `{ items, page, limit, total, totalPages }`. Query `page` defaults to 1; `limit` defaults to 12, max 48.
- Unknown body fields are rejected with `400 VALIDATION_ERROR` (no mass assignment).

## Health

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | – | Liveness `{status:"ok"}` (outside `/api/v1`) |
| GET | `/health/ready` | – | Database ping, `503` when down |

## Auth `/auth`

| Method | Path | Auth | Body / notes |
| --- | --- | --- | --- |
| GET | `/me` | – | `{ user \| null, csrfToken }` |
| POST | `/register` | – | `{ name, email, password, phone?, acceptTerms: true }` → `201 { user, csrfToken }`. Always creates a customer |
| POST | `/login` | – | `{ email, password }` → `{ user, csrfToken }`. Rotates the session and merges the guest cart. Rate limited |
| POST | `/logout` | – | Destroys the session and returns a fresh anonymous `csrfToken` |
| POST | `/forgot-password` | – | `{ email }` → `202`. Same response whether or not the account exists. Rate limited |
| POST | `/reset-password` | – | `{ token, password }`. Single-use token; signs out all sessions |
| POST | `/verify-email` | – | `{ token }` |
| POST | `/resend-verification` | user | `202` |

## Users and addresses `/users`

| Method | Path | Auth | Body / notes |
| --- | --- | --- | --- |
| PATCH | `/me` | user | `{ name?, phone?, currentPassword?, newPassword? }`. A password change rotates the session and signs out other devices |
| GET | `/me/addresses` | user | `{ items: AddressDto[] }` |
| POST | `/me/addresses` | user | `{ label?, fullName, phone, addressLine1, addressLine2?, landmark?, city, state, postalCode, isDefault? }` (max 10) |
| PATCH | `/me/addresses/:id` | owner | Partial. An empty string clears an optional line |
| DELETE | `/me/addresses/:id` | owner | `204` |

## Catalogue

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/products` | Query: `q, type, finish (comma list), minPrice, maxPrice (rupees), inStock, sort (new\|bestsellers\|top-rated\|price-asc\|price-desc), page, limit` |
| GET | `/products/featured` · `/bestsellers` · `/new-arrivals` · `/top-rated` | `?limit` (max 24) → `{ items, fallback }`. `fallback: true` means featured products were returned for lack of sales or review data |
| GET | `/products/sitemap` | Published slugs and `updatedAt` |
| GET | `/products/:slug` | Published products only, else `404` |
| GET | `/products/:slug/related` | Up to 4 related products |
| GET | `/products/:productId/reviews` | Approved reviews, `?sort=recent\|highest\|lowest`, plus `distribution` |
| POST | `/products/:productId/reviews` | user. `{ rating 1–5, title, comment }`. `403 NOT_VERIFIED_PURCHASE` unless the user received the product in a delivered order; `409` if already reviewed. Created as `pending` |
| GET | `/categories` | Categories with published product counts and `image` (the tile picture set in admin, or `null` for the built-in photo) |
| GET | `/search` | Same query as `/products`; `q` required |
| GET | `/search/suggest` | `?q` (1–80 chars) → `{ suggestions: [{ label, href }], products }`: up to 6 phrases (categories, types, finish + type, keywords, product names; every typed word must start a word) and 5 best-selling matching products, for the header type-ahead |

## Reviews `/reviews` (user)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/mine` | The user's reviews |
| PATCH | `/:id` | Owner only. An edit sends the review back to moderation |
| DELETE | `/:id` | Owner or admin |

## Cart `/cart` (guest or user)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/` | `CartDto` (lines with current price, `availableStock` and an `issue` message when a line can't be bought) |
| POST | `/items` | `{ productId, quantity 1–10, size? }`. Adds to an existing line; `409` when stock is insufficient |
| PATCH | `/items/:productId` | `{ quantity, size? }` |
| DELETE | `/items/:productId` | Remove a line |
| DELETE | `/` | Empty the cart |

## Checkout `/checkout` (user)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/quote` | `{ paymentMethod: 'razorpay'\|'cod', couponCode? }` → lines, subtotal, shipping, `paymentFeePaise`, `discountPaise`, total, `codAvailable`, `onlinePaymentAvailable`, `issues`, `coupon` (applied) or `couponError` (why the code was not applied; never an HTTP error) |
| POST | `/` | Header **`Idempotency-Key`** (16–100 chars `[A-Za-z0-9_-]`). Body `{ addressId, paymentMethod, couponCode?, expectedTotalPaise?, notes? }` → `201 { order }`, or `200 { order, replayed: true }` for a repeated key. Errors: `CART_EMPTY`, `CART_INVALID`, `INSUFFICIENT_STOCK`, `PRICE_CHANGED`, `CHECKOUT_IN_PROGRESS`, `COD_UNAVAILABLE`, `PAYMENT_NOT_CONFIGURED`, `COUPON_INVALID`, `COUPON_NOT_STARTED`, `COUPON_EXPIRED`, `COUPON_NOT_APPLICABLE` |

A coupon takes its percentage off only the lines whose product type it covers (every line for a sitewide coupon). Shipping is decided on the subtotal before the discount.

## Coupons `/coupons` (public)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | Live coupons (active and inside their dates) for the storefront carousel: `{ items: PublicCouponDto[] }` |

## Orders `/orders` (user; only the user's own orders, others return `404`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | `?status`, paginated `OrderDto` |
| GET | `/:orderNumber` | Includes `canCancel`, `canPay`, `canRequestReturn`, `reviewableProductIds` |
| POST | `/:orderNumber/cancel` | `{ reason? }`. Allowed while `pending_payment` or `confirmed`; releases stock and refunds a captured payment |
| POST | `/:orderNumber/return-request` | `{ reason }`. Within 7 days of delivery |

## Payments

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/payments/config` | – | `{ razorpayEnabled, codEnabled }` |
| POST | `/payments/razorpay/create-order` | user | `{ orderNumber }` → `{ keyId, razorpayOrderId, amountPaise, currency, orderNumber, name, description, prefill }`. Reuses an open Razorpay order |
| POST | `/payments/razorpay/verify` | user | `{ orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature }` → `{ paid, message, order }`. `paid:false` means the payment isn't captured yet; the webhook will finish it |
| POST | `/webhooks/razorpay` | signature | Razorpay only. Raw body, `X-Razorpay-Signature`, `X-Razorpay-Event-Id`. Returns `200` (processed, ignored or duplicate), `400` (bad signature), `409` (in progress) or `500` (Razorpay will retry) |

## Admin `/admin` (admin role, checked in the database on every request)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/dashboard` | `DashboardDto` (orders, gross, refunds, net, AOV, 30-day stats, status summary, recent orders, low stock, bestsellers, pending reviews) |
| GET | `/products` | `?q, type, finish, status, lowStock, sort (updated\|name\|stock\|price)`. Archived products are hidden unless `status=archived` |
| GET | `/products/:id` | `AdminProductDto` (includes stock, status, file keys) |
| POST | `/products` | `createProductSchema`: `slug` is optional (generated). Publishing requires at least one image. Image URLs may be site paths or any direct `https` link; videos and anything with a file key must be UploadThing uploads (tracked keys) |
| PATCH | `/products/:id` | Partial `updateProductSchema` (no stock, ratings or sales). Removed media files are deleted from UploadThing |
| DELETE | `/products/:id` | `{ result: 'archived' }` if the product appears in orders, otherwise `{ result: 'deleted' }` (media removed) |
| PATCH | `/products/:id/stock` | `{ set }` or `{ adjust, reason? }`. Atomic, never below zero, audited |
| GET | `/orders` | `?q (order no., email, name, phone), status, paymentStatus, paymentMethod` |
| GET | `/orders/:id` | `AdminOrderDto` with customer, payment records and refunds |
| PATCH | `/orders/:id/status` | `{ status, note?, tracking? {carrier, trackingNumber, trackingUrl?}, codCollected?, restock? }`. Allowed transitions: confirmed→processing/shipped/cancelled, processing→shipped/cancelled, shipped→delivered, return_requested→returned/delivered (reject return). Shipping requires tracking. Sending the current status with `codCollected` records COD collection only |
| POST | `/orders/:id/refund` | `{ amountPaise?, reason, restock? }`. Before shipping it cancels and refunds in full; after delivery partial refunds are allowed. COD orders are refunded outside the gateway |
| GET | `/reviews` | `?status` |
| PATCH | `/reviews/:id` | `{ status: 'approved'\|'rejected', moderationNote? }`. Approval re-checks the qualifying order and recomputes ratings |
| GET | `/coupons` | `{ items: CouponDto[] }` with `usageCount` (orders using the code, excluding cancelled) |
| GET | `/coupons/:id` | `CouponDto` |
| POST | `/coupons` | `couponInputSchema`: `{ code, title, description?, discountPercent (1–90), appliesTo (product types; empty = sitewide), image? { url (site path, upload or direct https link), key?, alt }, active, startsAt?, endsAt?, sortOrder }`. `409 COUPON_CODE_TAKEN` for a duplicate code. Uploaded banners are kept out of the orphan-media cleanup |
| PATCH | `/coupons/:id` | Full `couponInputSchema` body. A replaced banner file is deleted from UploadThing |
| DELETE | `/coupons/:id` | `204`. Past orders keep their discount and code |
| GET | `/category-images` | `{ items: AdminCategoryImageDto[] }`: every category with its custom tile picture (or `null`) |
| PATCH | `/category-images/:type` | `{ image: { url, key?, alt } \| null }` → updated list. `url` may be an upload, a site path or a direct `https` link; `null` restores the built-in photo. A replaced uploaded file is deleted from UploadThing |
| GET | `/uploads/config` | `{ enabled, maxImageSize, maxVideoSize, maxVideoSeconds }` |
| POST | `/uploads/token` | `{ token, expiresAt }`: a 10-minute Bearer token for the UploadThing endpoint |
| POST | `/uploads/confirm` | `{ kind: 'image'\|'video', keys }` → `204`. The admin page calls this after each upload; keys are checked with UploadThing and recorded, so uploads work even if UploadThing's server callback was missed |

## UploadThing endpoint

`/api/uploadthing` (outside `/api/v1`) is served by the official `uploadthing/express` adapter. Routes are `productImage` and `productVideo`. Every request needs `Authorization: Bearer <upload token>` for an active admin. It returns `503 UPLOADS_NOT_CONFIGURED` when `UPLOADTHING_TOKEN` is unset.
