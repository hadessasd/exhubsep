import { createFileRoute } from "@tanstack/react-router";
import {
  authorizeByAuthKey,
  clientIp,
  json,
  jsonError,
  maskAuthKey,
} from "@/lib/server/whitelist";

/**
 * macOS / client authorize by auth key (no serial required).
 * POST /api/whitelist/activate
 *
 * Body (JSON):
 * {
 *   "authKey": "<code from /activate or admin>",
 *   "category": "sat",           // optional; must match key if set
 *   "hostname": "...",           // optional metadata
 *   "ip": "...",                 // optional
 *   "approxLocation": "..."      // optional
 * }
 *
 * Auth key stays valid until revoke / expiry (not burned).
 * Same authorization as POST /api/whitelist/verify with authKey.
 */
export const Route = createFileRoute("/api/whitelist/activate")({
  server: {
    handlers: {
      OPTIONS: async () => json({ ok: true }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Record<string, unknown>;

          const authKey = String(
            body.authKey ?? body.auth_key ?? body.authCode ?? body.auth_code ?? "",
          ).trim();
          const hostname = String(
            body.hostname ?? body.hostName ?? body.host_name ?? "",
          ).trim();
          const ip = String(
            body.ip ?? body.ipAddress ?? body.ip_address ?? "",
          ).trim();
          const approxLocation = String(
            body.approxLocation ??
              body.approximateLocation ??
              body.approx_location ??
              body.location ??
              "",
          ).trim();
          const os = String(body.os ?? "").trim() || null;
          const category = String(body.category ?? "").trim() || null;
          const productKey = String(
            body.productKey ?? body.product_key ?? "",
          ).trim() || null;

          if (!authKey) {
            return jsonError("authKey required", 400);
          }

          const requestIp = await clientIp(request);
          console.info(
            "[whitelist/activate] authorize",
            maskAuthKey(authKey),
            "ip=",
            requestIp || ip || "n/a",
          );

          const result = await authorizeByAuthKey({
            authKey,
            category,
            productKey,
            hostname: hostname || null,
            ip: ip || null,
            approxLocation: approxLocation || null,
            requestIp: requestIp || null,
            os,
          });

          return json({
            ok: result.ok,
            authorized: result.authorized,
            status: result.status,
            keyId: result.keyId,
            productKey: result.productKey,
            category: result.category,
            keyName: result.keyName,
            expiresAt: result.expiresAt,
            message:
              "Authorized by auth key. Key remains active until revoked or expired. Use the same authKey on subsequent verify calls.",
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Authorize failed";
          const status =
            message.includes("Too many")
              ? 429
              : message.includes("Invalid")
                ? 401
                : message.includes("revoked") ||
                    message.includes("expired") ||
                    message.includes("category")
                  ? 403
                  : 400;
          return jsonError(message, status);
        }
      },
    },
  },
});
