import { createFileRoute } from "@tanstack/react-router";
import {
  authorizeByAuthKey,
  clientIp,
  daemonAuthCheck,
  json,
  jsonError,
  verifyMachine,
} from "@/lib/server/whitelist";

/**
 * Public verify — preferred: auth key only.
 * POST JSON { "authKey": "...", "category"?: "sat"|… }
 * Optional metadata: hostname, ip, approxLocation.
 *
 * Legacy (admin / older clients): { machineId, category? } serial path still works.
 */
export const Route = createFileRoute("/api/whitelist/verify")({
  server: {
    handlers: {
      OPTIONS: async () => json({ ok: true }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const authKey =
            url.searchParams.get("authKey")?.trim() ||
            url.searchParams.get("auth_key")?.trim() ||
            url.searchParams.get("authCode")?.trim();
          if (authKey) {
            const result = await authorizeByAuthKey({
              authKey,
              category: url.searchParams.get("category") || undefined,
              productKey:
                url.searchParams.get("productKey") ||
                url.searchParams.get("product_key") ||
                undefined,
              hostname: url.searchParams.get("hostname") || undefined,
              os: url.searchParams.get("os") || undefined,
              requestIp: await clientIp(request),
            });
            return json(result, 200);
          }
          const machineId =
            url.searchParams.get("machineId")?.trim() ||
            url.searchParams.get("machine_id")?.trim();
          if (!machineId) {
            return jsonError("authKey required (or legacy machineId)", 400);
          }
          const category =
            url.searchParams.get("category")?.trim() || undefined;
          const productKey =
            url.searchParams.get("productKey")?.trim() ||
            url.searchParams.get("product_key")?.trim() ||
            undefined;
          const exam = url.searchParams.get("exam")?.trim() || undefined;
          const tier = url.searchParams.get("tier")?.trim() || undefined;
          if (category || productKey || exam) {
            const result = await verifyMachine({
              machineId,
              category,
              productKey,
              exam,
              tier,
              hostname: url.searchParams.get("hostname") || undefined,
              os: url.searchParams.get("os") || undefined,
              isAdmin: url.searchParams.get("isAdmin") || undefined,
              lastIp: await clientIp(request),
            });
            return json(result, result.authorized ? 200 : 403);
          }
          const result = await daemonAuthCheck({
            machineId,
            hostname: url.searchParams.get("hostname") || undefined,
            os: url.searchParams.get("os") || undefined,
            isAdmin: url.searchParams.get("isAdmin") || undefined,
            lastIp: await clientIp(request),
            autoPending: true,
          });
          return json(result, result.authorized ? 200 : 403);
        } catch (err) {
          return jsonError(err, 400);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            authKey?: string;
            auth_key?: string;
            authCode?: string;
            auth_code?: string;
            machineId?: string;
            sessionToken?: string;
            hostname?: string;
            ip?: string;
            ipAddress?: string;
            approxLocation?: string;
            approximateLocation?: string;
            location?: string;
            os?: string;
            isAdmin?: string;
            category?: string;
            productKey?: string;
            product_key?: string;
            exam?: string;
            tier?: string;
            autoPending?: boolean;
          };

          const authKey = (
            body.authKey ||
            body.auth_key ||
            body.authCode ||
            body.auth_code ||
            ""
          ).trim();

          if (authKey) {
            const result = await authorizeByAuthKey({
              authKey,
              category: body.category,
              productKey: body.productKey || body.product_key,
              exam: body.exam,
              tier: body.tier,
              hostname: body.hostname,
              ip: body.ip || body.ipAddress || null,
              approxLocation:
                body.approxLocation ||
                body.approximateLocation ||
                body.location ||
                null,
              requestIp: await clientIp(request),
              os: body.os,
            });
            return json(result, 200);
          }

          if (!body.machineId?.trim()) {
            return jsonError("authKey required (or legacy machineId)", 400);
          }
          const productKey = body.productKey || body.product_key;
          if (
            body.autoPending &&
            !body.category &&
            !productKey &&
            !body.exam
          ) {
            const result = await daemonAuthCheck({
              machineId: body.machineId,
              hostname: body.hostname,
              os: body.os,
              isAdmin: body.isAdmin,
              lastIp: await clientIp(request),
              autoPending: true,
            });
            return json(result, result.authorized ? 200 : 403);
          }
          const result = await verifyMachine({
            machineId: body.machineId,
            sessionToken: body.sessionToken,
            hostname: body.hostname,
            os: body.os,
            isAdmin: body.isAdmin,
            category: body.category,
            productKey,
            exam: body.exam,
            tier: body.tier,
            lastIp: await clientIp(request),
          });
          return json(result, result.ok ? 200 : 403);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Verify failed";
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
