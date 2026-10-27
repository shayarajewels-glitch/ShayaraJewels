# Database (MongoDB + Mongoose)

All collections have timestamps unless noted. Money fields are integer paise. Schemas live in `apps/api/src/models`.

## Collections

| Model | Key fields | Indexes |
| --- | --- | --- |
| **User** | name, `email` (lower-cased), phone, `passwordHash` (`select:false`), `role` customer\|admin, emailVerified, isActive, passwordChangedAt, lastLoginAt | `email` unique, `role` |
| **Session** | `tokenHash` (SHA-256 of the cookie token), userId (null for guests), expiresAt, lastSeenAt, userAgent | `tokenHash` unique, `userId`, TTL on `expiresAt` |
| **AuthToken** | userId, purpose password_reset\|email_verification, `tokenHash`, expiresAt, usedAt | `tokenHash` unique, `{userId, purpose}`, TTL (expiresAt + 1 day) |
| **Address** | userId, label, fullName, phone, addressLine1/2, landmark, city, state (enum of Indian states/UTs), postalCode, country IN, isDefault | `{userId, createdAt}`, partial unique `{userId}` where `isDefault` (one default each) |
| **Product** | name, `slug`, `sku`, description, type, finish, baseMaterial, sizeOptions, careInstructions, pricePaise, compareAtPricePaise, `stock`, images[{url,key,alt,sortOrder}], videos[{url,key,thumbnailUrl,thumbnailKey}], averageRating, reviewCount, ratingScore, unitsSold, `status` draft\|published\|archived, featured, publishedAt, searchKeywords, seoTitle, seoDescription | `slug` unique, `sku` unique, compound `{status,…}` for every listing sort, `{stock,status}`, weighted text index |
| **Cart** | userId *or* sessionId, items[{productId, quantity, size, addedAt}], checkoutLock{key, at} | partial unique `userId`, partial unique `sessionId`, TTL 30 days on guest carts |
| **Order** | `orderNumber` (SHY-YYMMDD-XXXXXX), userId, items[snapshot: productId, name, slug, sku, image, size, unitPricePaise, quantity, lineTotalPaise], shippingAddress (snapshot), subtotal/shipping/paymentFee/discount/total, paymentMethod, paymentStatus, codCollectionStatus, status, paymentExpiresAt, stockReserved, salesCounted, refundedPaise, paidAt, deliveredAt, cancellation, returnRequest, tracking, timeline[], `idempotencyKey`, notes, attention | `orderNumber` unique, `{userId, idempotencyKey}` unique, `{userId, createdAt}`, `{status, createdAt}`, `{paymentStatus, createdAt}`, `{status, paymentExpiresAt}`, `{userId, status, items.productId}` |
| **Payment** | orderId, userId, provider razorpay\|mock, `providerOrderId`, `providerPaymentId`, amountPaise, currency INR, status created\|authorized\|captured\|failed\|partially_refunded\|refunded, method, signatureVerifiedAt, capturedAt, failureReason, refunds[{providerRefundId, amountPaise, status, reason, requestedBy}], events[] (audit trail) | `providerOrderId` unique, `providerPaymentId` unique (partial), `refunds.providerRefundId` unique (partial), `{orderId, createdAt}` |
| **Review** | userId, productId, orderId (qualifying delivered order), rating 1–5, title, comment, status pending\|approved\|rejected, moderation fields | `{userId, productId}` unique, `{productId, status, createdAt}`, `{status, createdAt}` |
| **WebhookEvent** | provider, `eventId`, eventType, status processing\|processed\|ignored\|failed, attempts, payloadSha256, error, receivedAt, processedAt | `{provider, eventId}` unique |
| **MediaAsset** | `key`, url, kind image\|video, uploadedBy, status pending\|attached\|deleted, productId | `key` unique, `{status, createdAt}` |
| **InventoryAdjustment** | productId, delta, resultingStock, reason, adminId | `{productId, createdAt}` |

## Order state

**Fulfilment status:** `pending_payment` → `confirmed` → `processing` → `shipped` → `delivered` → (`return_requested` → `returned` or back to `delivered`); `cancelled` from `pending_payment`, `confirmed` or `processing`.

**Payment status:** `pending` → `paid`, or `failed` (still payable) → `paid`, or `expired` (window closed or order cancelled unpaid). After that, `partially_refunded` and `refunded`. COD orders stay `pending` until cash collection is recorded; `codCollectionStatus` tracks that separately.

Every transition is an atomic `findOneAndUpdate` that names the expected current state, so concurrent or duplicate events cannot apply twice.

## Consistency rules

- **Stock:** deducted at checkout with a conditional `$inc`, inside a transaction when available. Returned to stock exactly once via the `stockReserved` flag: on expiry or cancellation, or on return when the admin chooses to restock.
- **unitsSold:** added once at confirmation (`salesCounted` flag) and removed on cancellation or return.
- **averageRating, reviewCount, ratingScore:** recomputed from approved reviews by aggregation after every moderation, edit or delete. They are never incremented blindly.

## Transactions

`withOptionalTransaction` uses multi-document transactions when the server is a replica set or sharded cluster (Atlas, or the local `npm run db:dev`). On a standalone `mongod` it runs the same steps with single-document atomic updates and explicit compensation. Both paths are covered by tests.
