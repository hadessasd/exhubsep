# ExamHub — Deploy to Render (via GitHub)

## Zip contents

Upload the repo root to GitHub (all files from this package). Do **not** upload `node_modules`.

## Render setup

1. **New Web Service** → connect the GitHub repo (or Blueprint with `render.yaml`).
2. **Build command:** `npm ci --include=dev && npm run build:render`
3. **Start command:** `npm start`
4. **Environment variables:**

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `NITRO_PRESET` | `node-server` |
| `VITE_AUTH_ENABLED` | `true` |
| `BETTER_AUTH_URL` | `https://www.examhub.shop` (your public URL, no trailing slash) |
| `BETTER_AUTH_SECRET` | long random secret (32+ chars) |
| `DATABASE_URL` | Neon / Postgres connection string |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from Stripe webhook |

Optional: `SERIAL_ENCRYPTION_KEY` (defaults to auth secret).

## Stripe Payment Links (tier → URL)

Preferred checkout uses **Payment Links** (`buy.stripe.com`), not ad-hoc Checkout Sessions.

| Tier | Price | Payment Link |
|------|-------|--------------|
| Standard | $190 | `https://buy.stripe.com/8x27sL3mm6ht9k1eqY83C03` |
| Pro | $450 | `https://buy.stripe.com/6oUeVdbSSaxJdAhbeM83C00` |
| Premium | $890 | `https://buy.stripe.com/00w3cv7CC8pB9k12Ig83C02` |

- **SAT / ACT** products use the tier links above. Checkout appends `client_reference_id=<product-id>` (e.g. `sat-pro`, `act-premium`) so the webhook + `/activate` map the purchase.
- **GMAT / GRE** Standard · Pro · Premium ship with **empty** Payment Link placeholders. Paste live `buy.stripe.com` URLs in **Admin → Delivery → Payment Links** (no fake URLs in the client bundle).
- Buy Button IDs remain as a fallback when a Payment Link is missing.

### Stripe Dashboard

1. Payment Link / Buy Button **success URL:**  
   `https://www.examhub.shop/activate?session_id={CHECKOUT_SESSION_ID}`
2. Webhook endpoint:  
   `https://www.examhub.shop/api/stripe/webhook`  
   Event: `checkout.session.completed`
3. Client reference IDs: `sat-standard` / `sat-pro` / `sat-premium` / `act-*` / `gmat-*` / `gre-*` / `research` / `internship`

## Post-payment

1. Webhook (or activate fallback with `STRIPE_SECRET_KEY`) marks the session paid.
2. Buyer opens `/activate`, picks OS, enters machine serial → auto-whitelist **active**.
3. UI shows **auth code** (machine session token) + **app download** (admin delivery file upload and/or external link + instructions).

## Admin delivery

**Admin → Delivery**

- Per product/tier/OS scope: upload app file **and/or** set external download URL + buyer instructions / steps.
- GMAT/GRE Payment Links: paste when ready.
- Uploaded files are stored server-side and served at `/api/delivery/file/:id` (no secrets in the client bundle).

## Daemon machine auth

ExamHub Daemon calls:

```text
GET https://www.examhub.shop/api/auth?machineId=<SHA256 of serial>&os=macos&hostname=…&isAdmin=true
```

Response: `{ "authorized": true|false, "status": "active"|"pending"|… }`

- Unknown machines auto-create as **pending** (Admin → Machines → Approve)
- Stripe Activate with raw serial → **active** (matches Daemon hash)

## Admin

- Email: `minjunnios@gmail.com` (locked admin)
- **Simulate** — fake pay + whitelist without Stripe
- **Machines / Progress / Delivery**

## Local build check (same as Render)

```bash
npm ci --include=dev
npm run typecheck
NITRO_PRESET=node-server npm run build:render
npm start
```
