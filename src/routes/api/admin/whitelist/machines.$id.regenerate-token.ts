import { createFileRoute } from "@tanstack/react-router";
import {
  json,
  jsonError,
  regenerateToken,
  requireAdminFromRequest,
} from "@/lib/server/whitelist";

export const Route = createFileRoute(
  "/api/admin/whitelist/machines/$id/regenerate-token",
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          await requireAdminFromRequest(request);
          const machine = await regenerateToken(params.id);
          return json(machine);
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
