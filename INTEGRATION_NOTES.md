# ExamHub integration notes

## Serial verification

The client sends the raw serial to ExamHub. ExamHub trims it, uppercases it, SHA-256 hashes it server-side, and compares the digest with `machine_whitelist.machine_id_hash`.

POST `https://examhub.shop/api/whitelist/verify`

```json
{"machineId":"C02ABC123XYZ"}
```

A whitelisted machine returns `authorized: true` and `status: "active"`.

After a successful Stripe purchase, `/activate` accepts the buyer's raw serial and stores only its SHA-256 digest in the whitelist.

## OpenRouter reroute

POST `https://examhub.shop/api/reroute/openrouter` with the caller's own OpenRouter key:

```http
Authorization: Bearer sk-or-v1-...
Content-Type: application/json
```

The JSON body is forwarded only to `https://openrouter.ai/api/v1/chat/completions`. There is no whitelist requirement for this route.

The admin dashboard has an **AI Reroute** tab for testing and for viewing request body, HTTP status, success/failure, latency, IP, and a masked API-key hint. Full OpenRouter keys are never persisted in logs.
