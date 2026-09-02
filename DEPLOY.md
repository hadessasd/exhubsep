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

## Stripe (live)

1. Buy Button **success URL:**  
   `https://www.examhub.shop/activate?session_id={CHECKOUT_SESSION_ID}`
2. Webhook endpoint:  
   `https://www.examhub.shop/api/stripe/webhook`  
   Event: `checkout.session.completed`
3. Client reference IDs: `standard` / `pro` / `premium` / `research` / `internship`

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
