import { createFileRoute } from "@tanstack/react-router";
import { json, jsonError, requireAdminFromRequest } from "@/lib/server/whitelist";
import { clearOpenRouterLogs, listOpenRouterLogs } from "@/lib/server/openrouter-proxy";

export const Route = createFileRoute("/api/admin/reroute/logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          return json(await listOpenRouterLogs(250));
        } catch (err) {
          return jsonError(err, 403);
        }
      },
      DELETE: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          await clearOpenRouterLogs();
          return json({ ok: true });
        } catch (err) {
          return jsonError(err, 403);
        }
      },
    },
  },
});
