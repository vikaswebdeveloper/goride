# GoRide India – Outstation Cab Booking

Full-stack Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma/PostgreSQL + Razorpay.
Branding is configurable in `src/config/site.ts` / `NEXT_PUBLIC_APP_NAME`.

## Quick start
```bash
npm install
cp .env.example .env            # fill DATABASE_URL, AUTH_SECRET (openssl rand -base64 32), SEED_ADMIN_*
npx prisma migrate deploy       # or: npm run db:migrate (dev)
npm run db:seed                 # demo cars, DEMO pricing, routes, coupon WELCOME10, admin account
npm run dev                     # http://localhost:3000
```
Admin login = `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` → `/admin/dashboard`.

## Razorpay (test mode)
1. Razorpay Dashboard → switch to **Test Mode** → Settings → API Keys → generate. Put `RAZORPAY_KEY_ID` (rzp_test_…) and `RAZORPAY_KEY_SECRET` in `.env`.
2. Webhooks: Settings → Webhooks → Add. URL `https://<public-host>/api/payments/webhook` (locally use a tunnel such as `ngrok http 3000`). Events: `payment.captured`, `order.paid`, `payment.failed`. Set a secret and copy it to `RAZORPAY_WEBHOOK_SECRET`.
3. Test cards/UPI: https://razorpay.com/docs/payments/payments/test-card-details/
4. No keys yet? Set `PAYMENT_PROVIDER=mock` for a local payment simulator (refused when `NODE_ENV=production`; moves no money).

## Maps
Without `MAPBOX_ACCESS_TOKEN` a seeded list of ~50 Indian cities is used and distance/fare are labelled **estimates** (haversine × 1.22). With a token the Mapbox adapter (`services/location/mapbox.provider.ts`) does geocoding + routing server-side. Provider interface: `services/location/types.ts`.

## Architecture
| Area | Files |
|---|---|
| Pricing (pure maths, paise integers) | `services/pricing.engine.ts`; DB wrapper `pricing.service.ts` |
| Availability / oversell protection | `availability.service.ts` – per-category daily fleet capacity, `SELECT … FOR UPDATE` lock on `FleetInventory`, 15-min holds |
| Booking lifecycle & cancellation policy | `booking-rules.ts`, `booking.service.ts` |
| Payments | `payment.service.ts` (single idempotent settle path for verify + webhook), provider port `payment/types.ts`, `razorpay.provider.ts`, `signature.ts` |
| Auth | `lib/session.ts` (HS256 JWT in HTTP-only SameSite=Lax cookie), `lib/auth.ts` guards, bcrypt(12) |
| API plumbing | `lib/api.ts` (envelope, error mapping, same-origin check), `lib/rate-limit.ts` (in-memory; use Redis for multi-instance) |
| Business knobs | `config/site.ts` (GST, hold minutes, cancellation tiers, lead time) |

Payment safety: amount always read from the DB booking snapshot; signature verified server-side (timing-safe); webhook verified on the raw body, deduplicated via `WebhookEvent` primary key in the same transaction; amount mismatch is refused; a booking confirms only after verified payment; late payment after expiry/cancellation or sold-out triggers re-check + automatic full refund; retries reuse the same order.

## Scripts
`npm run typecheck` · `npm run lint` · `npm test` (unit + integration; needs `TEST_DATABASE_URL` pointing at a migrated, seeded **separate** DB) · `npm run test:e2e` (Playwright; spins up its own server on :3100 against the test DB with the mock provider).

## Assumptions / before going live
- Pricing, fleet capacity, testimonials and legal pages are **demo placeholders**.
- Google login not implemented (email/password only).
- Invoice is printable HTML (Save as PDF from the browser).
- Replace in-memory rate limiting with a shared store; configure real Resend domain; add a scheduled job to call refund-retry for `REFUND_PENDING` bookings.
