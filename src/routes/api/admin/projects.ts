import { createFileRoute } from "@tanstack/react-router";
import {
  listServiceProjects,
  updateServiceProject,
} from "@/lib/server/delivery";
import {
  json,
  jsonError,
  requireAdminFromRequest,
} from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/admin/projects")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const projects = await listServiceProjects();
          return json(projects);
        } catch (err) {
          return jsonError(err, 403);
        }
      },
      POST: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const body = (await request.json()) as {
            id: string;
            progress?: number;
            deliveryUrl?: string | null;
            status?: string;
            adminMessage?: string | null;
            title?: string | null;
            notes?: string | null;
          };
          if (!body.id) return jsonError("id required", 400);
          const project = await updateServiceProject(body);
          return json(project);
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
