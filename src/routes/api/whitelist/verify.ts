import { createFileRoute } from "@tanstack/react-router";
import {
  clientIp,
  daemonAuthCheck,
  json,
  jsonError,
  verifyMachine,
} from "@/lib/server/whitelist";

/**
 * Public verify (software category scope):
 * - POST JSON { machineId, category?: "sat"|"act"|"gre"|"gmat"|"proctor" }
 * - productKey like "sat-pro" is accepted and mapped → "sat"
 * - general serials authorize any software category
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
            machineId?: string;
            sessionToken?: string;
            hostname?: string;
            os?: string;
            isAdmin?: string;
            category?: string;
            productKey?: string;
            product_key?: string;
            exam?: string;
            tier?: string;
            autoPending?: boolean;
          };
          if (!body.machineId?.trim()) {
            return jsonError("machineId required", 400);
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
          return jsonError(err, 400);
        }
      },
    },
  },
});
