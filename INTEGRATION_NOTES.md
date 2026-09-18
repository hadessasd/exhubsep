## Homepage showcase videos

Admin → **Delivery** → **Homepage showcase videos**: upload mp4/webm and/or paste YouTube/Vimeo/direct URL per category (`sat|act|gre|gmat|proctor`). Uploaded files play from `GET /api/showcase-videos/file/:category`. Public list: `GET /api/showcase-videos`. Homepage muted autoplay + controls; empty categories hide the player. Uploaded file takes precedence over URL.

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


## Admin-generated auth keys

Admin → **Machines** → **Generate auth key**: pick `sat` | `act` | `gre` | `gmat` | `proctor` (not research). Optional note + expiry.

Stored as `machine_whitelist.session_token` (`source=admin`, `product_key` = category, status `active`). Key stays valid until admin revokes it or it expires — **not burned** on use.

Same authorize endpoints as Stripe-issued keys:

```bash
curl -sS -X POST https://examhub.shop/api/whitelist/verify \
  -H 'content-type: application/json' \
  -d '{ "authKey": "ADMIN_GENERATED_KEY", "category": "sat" }'
```

Admin API: `POST /api/admin/whitelist/auth-keys` `{ "category":"sat", "note?:", "expiresAt?:" }` · `GET` lists active/revoked/expired · `{ "action":"revoke", "id":"…" }`.


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

### Authorize — macOS / client app (auth key only)

**Preferred:** `POST /api/whitelist/verify` with the auth key. Serial is **not** required.

```http
POST /api/whitelist/verify HTTP/1.1
Host: examhub.shop
Content-Type: application/json

{
  "authKey": "a1b2c3d4e5f6…",
  "category": "sat"
}
```

`category` is optional when the key already encodes it; if provided it must match the key’s category (or the key is `general`).

Optional metadata (stored as last-seen when sent): `hostname`, `ip`, `approxLocation`.

`POST /api/whitelist/activate` accepts the **same** body and performs the same authorization (alias — key is **not** burned).

Success sketch:

```json
{
  "ok": true,
  "authorized": true,
  "status": "active",
  "keyId": "m_…",
  "productKey": "sat",
  "category": "sat",
  "keyName": "SAT pro · macos · paid",
  "expiresAt": null
}
```

| Auth key category | Verify `category` | Result |
|-------------------|-------------------|--------|
| `sat` | `sat` (or omitted) | authorized |
| `sat` | `gre` | **not** authorized |
| `general` | any software category | authorized |

```bash
# Verify (primary)
curl -sS -X POST https://examhub.shop/api/whitelist/verify \
  -H 'content-type: application/json' \
  -d '{ "authKey": "PASTE_AUTH_CODE", "category": "sat" }'

# Activate alias (same semantics)
curl -sS -X POST https://examhub.shop/api/whitelist/activate \
  -H 'content-type: application/json' \
  -d '{ "authKey": "PASTE_AUTH_CODE", "hostname": "MacBook.local" }'
```

Legacy serial `machineId` verify still exists for admin/older tools but is **not** the documented macOS path.

## Serial verification (legacy / admin)

Software apps should use **auth key** verify (above). Serial hashing remains for admin Machines tools and older daemons:

POST `https://examhub.shop/api/whitelist/verify`

```json
{"machineId":"C02ABC123XYZ","category":"sat"}
```

After a successful Stripe purchase, `/activate` **auto-issues an active auth code** for the software category (no serial / machine registration). The page shows:

- **authCode** — `machine_whitelist.session_token` (`source=stripe`) for the ExamHub app
- **delivery** — download URL scoped to the purchased exam/tier/OS + instructions

Buyer enters the auth code in the app. `POST /api/whitelist/verify` `{ "authKey": "…" }` authorizes. The code stays active until revoked or expired.

Admin → **Machines → Active auth codes** lists Stripe-issued and admin-generated keys (filter defaults to active; revoke supported).


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

## macOS app auth (auth key only)

`POST /api/whitelist/verify` (or `/api/whitelist/activate` — same behavior)

```json
{
  "authKey": "a1b2c3d4…",
  "category": "sat",
  "hostname": "optional",
  "ip": "optional",
  "approxLocation": "optional"
}
```

Aliases: `auth_key` / `authCode` / `auth_code`. Serial / `machineId` are **not** required for the app path.

Success:

```json
{
  "ok": true,
  "authorized": true,
  "status": "active",
  "keyId": "m_…",
  "productKey": "sat",
  "category": "sat",
  "keyName": "…",
  "expiresAt": null
}
```

Server flow:

1. Look up `machine_whitelist.session_token` = authKey.
2. Reject if missing, revoked (`blocked`), or expired.
3. If `category` provided, it must match the key’s `product_key` (or key is `general`).
4. Optionally store hostname / ip / approx_location + `last_seen_at`.
5. Return authorized. **Do not** clear `session_token`.


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
