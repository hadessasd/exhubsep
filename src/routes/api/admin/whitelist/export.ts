import { createFileRoute } from "@tanstack/react-router";
import {
  exportMachinesJson,
  jsonError,
  requireAdminFromRequest,
} from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/admin/whitelist/export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const data = await exportMachinesJson();
          return new Response(JSON.stringify(data, null, 2), {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "content-disposition":
                'attachment; filename="examhub-machines.json"',
              "cache-control": "no-store",
            },
          });
        } catch (err) {
          return jsonError(err, 403);
        }
      },
    },
  },
});
