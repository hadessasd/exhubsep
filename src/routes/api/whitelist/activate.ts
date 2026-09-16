import { createFileRoute } from "@tanstack/react-router";
import {
  clientIp,
  json,
  jsonError,
  maskAuthKey,
  redeemAuthKey,
} from "@/lib/server/whitelist";

/**
 * macOS app one-time redeem:
 * POST /api/whitelist/activate
 *
 * Body (JSON):
 * {
 *   "authKey": "<one-time code from /activate>",
 *   "serialNumber": "<Mac serial>",
 *   "hostname": "<macOS hostname>",
 *   "ip": "<optional client IP>",
 *   "approxLocation": "<optional city / lat,lng / place string>"
 * }
 *
 * Aliases accepted: serial | machineId, ipAddress, location | approximateLocation
 *
 * On success: serial is whitelisted (SHA-256), metadata stored, authKey burned.
 * Later checks: POST /api/whitelist/verify { "machineId": "<serial>" }
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
          const serialNumber = String(
            body.serialNumber ??
              body.serial_number ??
              body.serial ??
              body.machineId ??
              body.machine_id ??
              "",
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
          const os = String(body.os ?? "macos").trim() || "macos";

          if (!authKey || !serialNumber || !hostname) {
            return jsonError(
              "authKey, serialNumber, and hostname are required",
              400,
            );
          }

          const requestIp = await clientIp(request);
          // Never log the full auth key
          console.info(
            "[whitelist/activate] redeem attempt",
            maskAuthKey(authKey),
            "ip=",
            requestIp || ip || "n/a",
          );

          const result = await redeemAuthKey({
            authKey,
            serialNumber,
            hostname,
            ip: ip || null,
            approxLocation: approxLocation || null,
            requestIp: requestIp || null,
            os,
          });

          return json({
            ok: result.ok,
            authorized: result.authorized,
            status: result.status,
            machineId: result.machineId,
            productKey: result.productKey,
            keyName: result.keyName,
            serialBound: result.serialBound,
            authKeyBurned: result.authKeyBurned,
            message:
              "Auth key burned. Serial is on this purchase product whitelist. Use POST /api/whitelist/verify with machineId + productKey.",
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Redeem failed";
          const status =
            message.includes("Too many")
              ? 429
              : message.includes("Invalid or already used")
                ? 401
                : message.includes("blocked") || message.includes("expired")
                  ? 403
                  : message.includes("already registered") ||
                      message.includes("different serial")
                    ? 409
                    : 400;
          return jsonError(message, status);
        }
      },
    },
  },
});
