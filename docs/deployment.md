# Deployment

The web app and API are deployed separately. Both need **Node.js 22.12+**.

## 1. Domains, cookies and HTTPS (read this first)

Login uses an HTTP-only session cookie set by the API. Browsers only send it reliably when the storefront and API are on the **same site** (same registrable domain):

- ✅ `https://shayara.in` (web) + `https://api.shayara.in` (API). This works with the defaults (`COOKIE_SAMESITE=lax`, host-only `__Host-` cookie).
- ⚠️ `https://shayara.vercel.app` + `https://shayara-api.onrender.com` are different sites. The cookie becomes third-party, which many browsers block. Avoid this for production, or use the same-origin proxy below.

### No custom domain yet: same-origin proxy

Set `API_PROXY_TARGET` on the web app to the API's URL. `next.config.ts` then rewrites `/api/v1/*` and `/api/uploadthing` on the storefront origin to the API, so the browser only ever talks to the storefront and the cookie stays first-party.

| Where | Variable | Example |
|---|---|---|
| Web (Vercel) | `API_PROXY_TARGET` | `https://shayara-api.onrender.com` |
| Web (Vercel) | `NEXT_PUBLIC_API_BASE_URL` | `https://shayara.vercel.app/api/v1` |
| Web (Vercel) | `API_INTERNAL_BASE_URL` | `https://shayara-api.onrender.com/api/v1` (server-side rendering skips the extra hop) |
| API (Render) | `FRONTEND_URL` | `https://shayara.vercel.app` |
| API (Render) | `API_BASE_URL` | `https://shayara-api.onrender.com` (UploadThing callbacks and Razorpay webhooks go here directly) |
| API (Render) | `TRUST_PROXY` | `2` (Vercel, then Render's load balancer) |

`render.yaml` at the repository root is a Render Blueprint for the API with these defaults. When a custom domain is added later, switch to the `api.` subdomain layout above and remove `API_PROXY_TARGET`.

Serve both over HTTPS. The API refuses to start in production if `FRONTEND_URL` is not `https://` or cookies are not secure.

## 2. MongoDB Atlas

1. Create an Atlas project and cluster. M0 is fine for a demo, but it has **no backups**; use M10 or higher for a real store.
2. **Database Access:** create a user with *readWrite* on the `shayara` database only. Use a long generated password.
3. **Network Access:** allow only your API host's outbound IPs, or your provider's documented ranges. Avoid `0.0.0.0/0` in production.
4. **Connect → Drivers:** copy the `mongodb+srv://…` string, set the database name (`…mongodb.net/shayara?retryWrites=true&w=majority`) and put it in `MONGODB_URI`.
5. Atlas clusters are replica sets, so transactions are used automatically. Indexes are created by Mongoose on startup (`autoIndex`). For large collections, build them ahead of time and set `autoIndex` off.

## 3. API (`apps/api`)

Hosts such as Render, Railway, Fly.io or a VM all work.

- **Build:** `npm ci && npm run build --workspace=@shayara/api`
- **Start:** `node --env-file-if-exists=.env apps/api/dist/server.js`, or `npm run start --workspace=@shayara/api`. On a host that injects environment variables, the env file is optional.
- **Health checks:** `GET /health` (liveness) and `GET /health/ready` (database).
- **Environment** (see `apps/api/.env.example`):
  - `NODE_ENV=production`, `PORT`, `MONGODB_URI`, `SESSION_SECRET` (48+ random bytes).
  - `FRONTEND_URL=https://shayara.in`, `API_BASE_URL=https://api.shayara.in`, `TRUST_PROXY=1` behind a load balancer.
  - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
  - `UPLOADTHING_TOKEN`.
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (setting `SMTP_HOST` selects `MAIL_TRANSPORT=smtp`).
  - `REVALIDATE_SECRET`, the same value as the web app.
- **Rate limits** are kept in memory per instance. With more than one instance, move them to a shared store such as Redis (see `src/middleware/rate-limit.ts`). Background jobs are safe to run on every instance.

## 4. Web (`apps/web`)

Vercel (set the project root to `apps/web`), Netlify, or any Node host via `next start`.

- **Build:** `npm ci && npm run build --workspace=@shayara/web`
- **Start:** `npm run start --workspace=@shayara/web` (port 3000)
- **Environment:**
  - `NEXT_PUBLIC_API_BASE_URL=https://api.shayara.in/api/v1` and `NEXT_PUBLIC_SITE_URL=https://shayara.in`. These are baked in at build time, so rebuild after changing them.
  - Optional `API_INTERNAL_BASE_URL`, for server-side rendering over a private network.
  - `REVALIDATE_SECRET` (server-only).
- `next.config.ts` sends a Content-Security-Policy that allows Razorpay Checkout and UploadThing hosts. Extend it if you add analytics or other third parties.

## 5. Create the first administrator

Run once against the production database, from a trusted machine or a one-off job with the production environment:

```bash
ADMIN_PASSWORD='<a long unique password>' npm run create-admin -- --email owner@shayara.in --name "Store Owner"
# or omit ADMIN_PASSWORD to be prompted (hidden input)
# --promote makes an existing customer account the first admin
```

The script refuses to run if any admin already exists, and there is no default password. Use `npm run seed` only for demo data; it refuses production unless `--allow-production` is passed.

## 6. Razorpay (start in test mode)

1. Sign up at Razorpay and switch the dashboard to **Test Mode**.
2. **Account & Settings → API Keys → Generate Test Key.** Put `rzp_test_…` in `RAZORPAY_KEY_ID` and the secret in `RAZORPAY_KEY_SECRET`. The key id is public; the secret stays on the API only.
3. **Account & Settings → Webhooks → Add New Webhook:**
   - **URL:** `https://api.shayara.in/api/v1/webhooks/razorpay`. For local testing, expose port 4000 with a tunnel such as `cloudflared` or `ngrok`.
   - **Secret:** a random string. Put the same value in `RAZORPAY_WEBHOOK_SECRET`.
   - **Events:** `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`.
4. Payment capture can be automatic (recommended) or manual. The API captures authorized payments itself when verifying.
5. Restart the API; the startup log should say `Payments: Razorpay (test mode)`.
6. Place an order with "Pay online" and use the test cards and UPI IDs from Razorpay's official test-mode documentation. Check that the order becomes **Confirmed** and that a `payment.captured` webhook was received (Webhooks → logs).
7. **Going live:** complete Razorpay KYC and activation, generate **live** keys, create a separate live webhook with its own secret, and update the API environment. Never mix test and live keys.

## 7. UploadThing (v7)

1. Create an app in the UploadThing dashboard.
2. **API Keys:** copy the v7 **token** into `UPLOADTHING_TOKEN` on the API. Never use a `NEXT_PUBLIC_` variable for it.
3. UploadThing calls the API at `${API_BASE_URL}/api/uploadthing` when an upload completes, so the API must be publicly reachable in production. In development the SDK's dev mode handles this.
4. Adjust `MEDIA_MAX_IMAGE_SIZE`, `MEDIA_MAX_VIDEO_SIZE` and `MEDIA_MAX_VIDEO_SECONDS` as needed.
5. Restart the API. In the admin product form the "Upload images" and "Upload video" buttons become active.

## 8. Email (SMTP)

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` with a transactional email provider (for example Amazon SES, Postmark, Brevo or Zoho). Configure SPF, DKIM and DMARC for your domain. Without SMTP in production, password-reset and verification emails are **not sent**; the API logs a warning without the token.

## Production launch checklist

**Infrastructure**
- [ ] Custom domain with HTTPS for the web and API (same parent domain); HSTS enabled.
- [ ] Atlas M10+ cluster with backups, a least-privilege DB user and an IP allowlist.
- [ ] `NODE_ENV=production`, strong unique `SESSION_SECRET` and `REVALIDATE_SECRET`, `TRUST_PROXY` set correctly.
- [ ] Health checks and uptime monitoring on `/health/ready`; logs shipped to a log service.

**Payments and providers**
- [ ] Razorpay live keys and a live webhook configured; a real low-value payment and refund tested end to end.
- [ ] UploadThing production app token set; a test upload and delete done.
- [ ] SMTP configured and domain authenticated; password reset tested.

**Accounts and data**
- [ ] First admin created with `create-admin`. No demo admin exists, and demo seed data has been removed or replaced.
- [ ] Real product photography, descriptions, base materials, prices and stock entered. Placeholder SVGs replaced.

**Legal and business**
- [x] `SUPPORT_EMAIL` in `apps/web/src/lib/config.ts` set to the store's inbox (shayarajewels@gmail.com).
- [x] Business address (`STORE_ADDRESS` in `apps/web/src/lib/config.ts`) shown on the contact page and footer.
- [ ] Grievance officer name and contact added to the contact page.
- [ ] Legal pages (terms, privacy, shipping, returns) reviewed by a legal adviser for your business. Shipping charges and the COD limit and fee in `packages/shared/src/constants/commerce.ts` match your courier contracts. GST invoicing arranged if applicable.

**Final checks**
- [ ] `npm run check` passes and `npm audit` is reviewed.
- [ ] robots.txt and sitemap verified; site submitted to Google Search Console.

## Backup and recovery

- **Atlas M10+:** enable **Cloud Backup** with continuous backup and point-in-time restore. Pick a retention policy (for example 7 days of point-in-time plus monthly snapshots).
- **M0 or self-hosted:** schedule `mongodump --uri "$MONGODB_URI" --gzip --archive=shayara-$(date +%F).gz` at least daily and copy the archives to separate, encrypted storage.
- **Restore** to a *new* cluster or database first (`mongorestore --uri … --gzip --archive=…`), check order and product counts, then repoint `MONGODB_URI`. Practise a restore before launch and every quarter.
- **Media** lives in UploadThing; product documents store each file's URL and key. Keep the original product photography in your own archive as well.
- **Secrets** (session, Razorpay, UploadThing, SMTP, revalidate) belong in your host's secret manager, with a documented rotation procedure. Rotating `SESSION_SECRET` signs everyone out and invalidates CSRF tokens.
- **Incident response:** if the database is restored to an earlier point, use the Razorpay dashboard to reconcile payments captured after the restore point. Webhook redelivery and the API's reconciliation job will re-apply them.
