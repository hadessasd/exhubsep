import { createFileRoute } from "@tanstack/react-router";
import {
  deleteMachine,
  json,
  jsonError,
  requireAdminFromRequest,
} from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/admin/whitelist/machines/$id")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          await requireAdminFromRequest(request);
          await deleteMachine(params.id);
          return json({ ok: true });
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
