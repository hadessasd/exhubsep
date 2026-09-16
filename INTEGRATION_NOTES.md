# ExamHub integration notes

## Stripe Payment Links

| Product family | Tiers | Link source |
|----------------|-------|-------------|
| SAT | Standard / Pro / Premium | Hardcoded live `buy.stripe.com` URLs (see `src/lib/data/stripe.ts`) |
| ACT | Standard / Pro / Premium | Same tier URLs as SAT |
| GMAT | Standard / Pro / Premium | Empty placeholders → Admin → Delivery → Payment Links |
| GRE | Standard / Pro / Premium | Empty placeholders → Admin → Delivery → Payment Links |

Checkout calls `/api/payment-links/:slug`, which resolves admin override → catalog default → empty, then appends `client_reference_id`.



## Admin buyer preview

Admin → **Simulate** (top card) and Admin → **Delivery** include **Preview buyer experience**:

1. Select a catalog package (e.g. `sat-pro`, `act-standard`, `gre-premium`, a proctor tool).
2. Choose buyer OS (macOS / Windows).
3. **Open buyer popup** — modal mirrors post-purchase `/activate` (payment chip, activated card, auth code, app downloads / instructions).

Delivery uses the same `resolveDeliveryAssets` / `resolveDeliveryAssetsBothOs` as real activate. The auth code is a labeled `PREVIEW_…` sample — **not** stored, **not** redeemable, and no Stripe session is created.

API: `GET /api/admin/preview-activate?productKey=sat-pro&os=macos` (admin auth). `?list=1` returns catalog packages for the picker.


## Delivery scope (category-wide vs tier)

Admin → Delivery can assign:

- **All category** — e.g. `sat-all-macos`, `act-all-windows` (covers Standard/Pro/Premium)
- **Tier-only** — e.g. `sat-pro-macos` (overrides all-category when present)
- **Proctor universal** — `proctor-universal` / `proctor-universal-macos`

Buyer of `sat-pro` on macOS: `sat-pro-macos` → else `sat-all-macos` → else broader fallbacks.

Whitelist stays **category-level** (`sat`); delivery may still be tier- or all-category-scoped.

## Software whitelist (category scope)

Software machine authorization is **category-level**, not Standard/Pro/Premium:

| Whitelist key | Meaning |
|---------------|---------|
| `general` | Serial-number keys — authorize **any** software category |
| `sat` | All SAT purchases (Standard / Pro / Premium) |
| `act` | All ACT purchases |
| `gre` | All GRE purchases |
| `gmat` | All GMAT purchases |
| `proctor` | Proctor / lockdown browser software |

Research papers, internships, and other non-software catalog items do **not** get whitelist tabs or category scopes.

Delivery assets remain per exam **tier** + OS (`sat-pro-macos`, …). Whitelist authorization is category-only.

Admin → Machines: **General** + **SAT / ACT / GRE / GMAT / Proctor** tabs (no per-tier whitelist tabs).

### Redeem (one-time) — macOS app

`POST /api/whitelist/activate`

```http
POST /api/whitelist/activate HTTP/1.1
Host: examhub.shop
Content-Type: application/json

{
  "authKey": "a1b2c3d4e5f6…",
  "serialNumber": "C02ABC123XYZ",
  "hostname": "Khals-MacBook-Pro.local",
  "ip": "203.0.113.10",
  "approxLocation": "Dubai, AE"
}
```

Category comes from the purchase bound to the auth key (SAT Pro → category `sat`). Success sketch:

```json
{
  "ok": true,
  "authorized": true,
  "status": "active",
  "machineId": "m_…",
  "productKey": "sat",
  "category": "sat",
  "serialBound": true,
  "authKeyBurned": true
}
```

After success the auth key cannot be reused. Later checks use verify with the serial + category.

### Verify — ongoing app checks

`POST /api/whitelist/verify`

```http
POST /api/whitelist/verify HTTP/1.1
Host: examhub.shop
Content-Type: application/json

{
  "machineId": "C02ABC123XYZ",
  "category": "sat"
}
```

Compat: `"productKey": "sat-pro"` is accepted and mapped → `sat`.

Success sketch:

```json
{
  "ok": true,
  "authorized": true,
  "status": "active",
  "keyName": "SAT pro · macos · paid",
  "productKey": "sat",
  "category": "sat"
}
```

| Serial on | Verify category | Result |
|-----------|-----------------|--------|
| `sat` | `sat` | authorized |
| `sat` | `gre` | **not** authorized |
| `general` | any software category | authorized |

```bash
# Redeem
curl -sS -X POST https://examhub.shop/api/whitelist/activate \
  -H 'content-type: application/json' \
  -d '{
    "authKey": "PASTE_AUTH_CODE",
    "serialNumber": "C02ABC123XYZ",
    "hostname": "Khals-MacBook-Pro.local",
    "ip": "203.0.113.10",
    "approxLocation": "Dubai, AE"
  }'

# Verify
curl -sS -X POST https://examhub.shop/api/whitelist/verify \
  -H 'content-type: application/json' \
  -d '{"machineId":"C02ABC123XYZ","category":"sat"}'
```


## Serial verification

The client sends the raw serial to ExamHub. ExamHub trims it, uppercases it, SHA-256 hashes it server-side, and compares the digest with `machine_whitelist.machine_id_hash`.

POST `https://examhub.shop/api/whitelist/verify`

```json
{"machineId":"C02ABC123XYZ","category":"sat"}
```

Omit `productKey` only for legacy clients; macOS apps should always send the package id.

A whitelisted machine returns `authorized: true` and `status: "active"`.

After a successful Stripe purchase, `/activate` accepts the buyer's raw serial and stores only its SHA-256 digest in the whitelist. The response includes:

- **authCode** — one-time `machine_whitelist.session_token` for the macOS app redeem call (`POST /api/whitelist/activate`)
- **delivery** — download URL scoped to the purchased exam/tier/OS (uploaded blob at `/api/delivery/file/:id` and/or external link) + instructions

After the app redeems, the auth code is burned; ongoing authorization is serial whitelist verify only.


## Product → software delivery mapping

Checkout always appends `client_reference_id=<product id>` (e.g. `sat-pro`, `act-standard`, `gmat-premium`, `gre-pro`) via `/api/payment-links/:slug` → `withStripeClientReference`.

| Buyer product page | `client_reference_id` | Delivery scope keys (examples) |
|--------------------|-----------------------|--------------------------------|
| SAT Standard/Pro/Premium | `sat-{tier}` | `sat-{tier}-macos`, `sat-all-macos` |
| ACT Standard/Pro/Premium | `act-{tier}` | `act-{tier}-macos`, `act-all-windows` |
| GMAT … | `gmat-{tier}` | `gmat-{tier}-macos`, … |
| GRE … | `gre-{tier}` | `gre-{tier}-macos`, … |

Webhook + `/api/activate/session` store/read `product_key` from `client_reference_id` (fallback: Stripe metadata / amount). `/activate` resolves downloads with `resolveDeliveryAssets({ exam, tier, os })` so SAT never surfaces GRE/GMAT/ACT assets when the purchase key carries the exam family.

Bare tier keys (`standard` / `pro` / `premium`) only appear when Stripe did not send a reference id — `/activate` then requires an exam pick before whitelisting.

## macOS app auth redeem (one-time)

After `/activate` shows an **auth code** (`machine_whitelist.session_token`), the macOS app redeems once:

`POST https://examhub.shop/api/whitelist/activate`

```json
{
  "authKey": "a1b2c3d4…",
  "serialNumber": "C02ABC123XYZ",
  "hostname": "Khals-MacBook-Pro.local",
  "ip": "203.0.113.10",
  "approxLocation": "Dubai, AE"
}
```

Accepted field aliases:

| Canonical | Also accepted |
|-----------|---------------|
| `authKey` | `auth_key`, `authCode`, `auth_code` |
| `serialNumber` | `serial_number`, `serial`, `machineId`, `machine_id` |
| `hostname` | `hostName`, `host_name` |
| `ip` | `ipAddress`, `ip_address` (optional; server also records `X-Forwarded-For`) |
| `approxLocation` | `approximateLocation`, `approx_location`, `location` (optional free text / city / `lat,lng`) |
| `os` | optional, defaults to `macos` |

Success response (200):

```json
{
  "ok": true,
  "authorized": true,
  "status": "active",
  "machineId": "m_…",
  "productKey": "sat-pro",
  "keyName": "SAT pro · macos · paid",
  "serialBound": true,
  "authKeyBurned": true,
  "message": "Auth key burned. Use POST /api/whitelist/verify with machineId (serial) for subsequent checks."
}
```

Behavior:

1. Validate `authKey` against `machine_whitelist.session_token` (must be present / unused).
2. SHA-256 hash `serialNumber` server-side; store digest in `machine_id_hash`.
3. Persist `hostname`, IP (`last_ip`), and `approx_location`.
4. **Burn** the auth key: `session_token = NULL` (one-time). Reuse returns 401.
5. Subsequent checks: `POST /api/whitelist/verify` with `{ "machineId": "<raw serial>" }` — do **not** send the burned auth key.

Example curl:

```bash
curl -sS -X POST https://examhub.shop/api/whitelist/activate \
  -H 'content-type: application/json' \
  -d '{
    "authKey": "PASTE_AUTH_CODE",
    "serialNumber": "C02ABC123XYZ",
    "hostname": "Khals-MacBook-Pro.local",
    "ip": "203.0.113.10",
    "approxLocation": "Dubai, AE"
  }'
```

Security: full auth keys are never written to logs (masked as `abcd…wxyz`). Invalid keys are rate-limited (fail closed). Keep Stripe / DB secrets out of the client bundle.

## Admin delivery

Scope keys: `exam-tier-os` (e.g. `gmat-pro-macos`, `sat-all-windows`, `proctor-universal`).

Fields: external download URL, optional uploaded file (base64 in DB), short message, buyer instructions, runbook steps.


## OS-specific software builds

Admin → Delivery assigns **separate** assets for macOS and Windows via scope keys:

- Exam apps: `{exam}-{tier}-{os}` or `{exam}-all-{os}` (e.g. `sat-pro-macos`, `gre-all-windows`)
- Coverage matrix in the admin panel shows Assigned / Assign for each exam × OS

`/activate` returns `delivery` for the chosen OS plus `deliveryByOs.macos` / `deliveryByOs.windows` so buyers can download the matching build (and see the other OS if both exist).

## Universal proctor delivery

All proctor / lockdown-browser products share **one** delivery pack:

- Primary: `proctor-universal`
- Optional OS builds: `proctor-universal-macos`, `proctor-universal-windows`

Exam pathways (SAT/ACT/GRE/GMAT) stay per-exam; proctor tools do **not** silo delivery by exam family.

## OpenRouter reroute

POST `https://examhub.shop/api/reroute/openrouter` with the caller's own OpenRouter key:

```http
Authorization: Bearer sk-or-v1-...
Content-Type: application/json
```

The JSON body is forwarded only to `https://openrouter.ai/api/v1/chat/completions`. There is no whitelist requirement for this route.

The admin dashboard has an **AI Reroute** tab for testing and for viewing request body, HTTP status, success/failure, latency, IP, and a masked API-key hint. Full OpenRouter keys are never persisted in logs.
