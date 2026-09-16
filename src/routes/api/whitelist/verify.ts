import { createFileRoute } from "@tanstack/react-router";
import {
  clientIp,
  daemonAuthCheck,
  json,
  jsonError,
  verifyMachine,
} from "@/lib/server/whitelist";

/**
 * Public verify:
 * - POST JSON { machineId, productKey? }  (app /activate tooling)
 * - GET  ?machineId=…&productKey=…        (Daemon alternate path)
 *
 * Product scope: when productKey (or exam+tier) is sent, the serial must be
 * whitelisted for that package (e.g. sat-pro). A serial on sat-pro does NOT
 * authorize gre-pro. product_key=general still authorizes any package.
 */
export const Route = createFileRoute("/api/whitelist/verify")({
  server: {
    handlers: {
      OPTIONS: async () => json({ ok: true }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const machineId =
            url.searchParams.get("machineId")?.trim() ||
            url.searchParams.get("machine_id")?.trim();
          if (!machineId) return jsonError("machineId required", 400);
          const productKey =
            url.searchParams.get("productKey")?.trim() ||
            url.searchParams.get("product_key")?.trim() ||
            undefined;
          const exam = url.searchParams.get("exam")?.trim() || undefined;
          const tier = url.searchParams.get("tier")?.trim() || undefined;
          if (productKey || exam) {
            const result = await verifyMachine({
              machineId,
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
            machineId?: string;
            sessionToken?: string;
            hostname?: string;
            os?: string;
            isAdmin?: string;
            productKey?: string;
            product_key?: string;
            exam?: string;
            tier?: string;
            /** if true, auto-create pending when unknown (general scope) */
            autoPending?: boolean;
          };
          if (!body.machineId?.trim()) {
            return jsonError("machineId required", 400);
          }
          const productKey = body.productKey || body.product_key;
          if (body.autoPending && !productKey && !body.exam) {
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
            productKey,
            exam: body.exam,
            tier: body.tier,
            lastIp: await clientIp(request),
          });
          return json(result, result.ok ? 200 : 403);
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
