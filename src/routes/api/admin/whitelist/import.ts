import { createFileRoute } from "@tanstack/react-router";
import {
  importMachines,
  json,
  jsonError,
  requireAdminFromRequest,
} from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/admin/whitelist/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const body = (await request.json()) as {
            mode?: "merge" | "replace";
            importData?: string;
          };
          if (!body.importData) return jsonError("importData required", 400);
          const result = await importMachines({
            mode: body.mode === "replace" ? "replace" : "merge",
            importData: body.importData,
          });
          return json(result);
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
