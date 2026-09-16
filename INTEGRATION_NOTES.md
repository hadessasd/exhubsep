# ExamHub integration notes

## Stripe Payment Links

| Product family | Tiers | Link source |
|----------------|-------|-------------|
| SAT | Standard / Pro / Premium | Hardcoded live `buy.stripe.com` URLs (see `src/lib/data/stripe.ts`) |
| ACT | Standard / Pro / Premium | Same tier URLs as SAT |
| GMAT | Standard / Pro / Premium | Empty placeholders → Admin → Delivery → Payment Links |
| GRE | Standard / Pro / Premium | Empty placeholders → Admin → Delivery → Payment Links |

Checkout calls `/api/payment-links/:slug`, which resolves admin override → catalog default → empty, then appends `client_reference_id`.

## Serial verification

The client sends the raw serial to ExamHub. ExamHub trims it, uppercases it, SHA-256 hashes it server-side, and compares the digest with `machine_whitelist.machine_id_hash`.

POST `https://examhub.shop/api/whitelist/verify`

```json
{"machineId":"C02ABC123XYZ"}
```

A whitelisted machine returns `authorized: true` and `status: "active"`.

After a successful Stripe purchase, `/activate` accepts the buyer's raw serial and stores only its SHA-256 digest in the whitelist. The response includes:

- **authCode** — `machine_whitelist.session_token` for the daemon / app
- **delivery** — download URL (uploaded blob at `/api/delivery/file/:id` and/or external link) + instructions

## Admin delivery

Scope keys: `exam-tier-os` (e.g. `gmat-pro-macos`, `sat-all-windows`, `proctor-universal`).

Fields: external download URL, optional uploaded file (base64 in DB), short message, buyer instructions, runbook steps.

## OpenRouter reroute

POST `https://examhub.shop/api/reroute/openrouter` with the caller's own OpenRouter key:

```http
Authorization: Bearer sk-or-v1-...
Content-Type: application/json
```

The JSON body is forwarded only to `https://openrouter.ai/api/v1/chat/completions`. There is no whitelist requirement for this route.

The admin dashboard has an **AI Reroute** tab for testing and for viewing request body, HTTP status, success/failure, latency, IP, and a masked API-key hint. Full OpenRouter keys are never persisted in logs.
