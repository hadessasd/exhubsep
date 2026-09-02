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
 * - POST JSON { machineId }  (web /activate tooling)
 * - GET  ?machineId=…        (same as Daemon, alternate path)
 *
 * Accepts the raw device serial; ExamHub SHA-256 hashes it server-side before lookup.
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
            /** if true, auto-create pending when unknown */
            autoPending?: boolean;
          };
          if (!body.machineId?.trim()) {
            return jsonError("machineId required", 400);
          }
          if (body.autoPending) {
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
