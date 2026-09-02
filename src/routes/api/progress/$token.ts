import { createFileRoute } from "@tanstack/react-router";
import { getProjectByToken } from "@/lib/server/delivery";
import { json, jsonError } from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/progress/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const project = await getProjectByToken(params.token);
          if (!project) return jsonError("Not found", 404);
          // Public: hide raw admin notes if sensitive — show progress + delivery when ready
          return json({
            kind: project.kind,
            title: project.title,
            progress: project.progress,
            status: project.status,
            adminMessage: project.adminMessage,
            deliveryUrl:
              project.progress >= 100 || project.status === "ready"
                ? project.deliveryUrl
                : null,
            updatedAt: project.updatedAt,
          });
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
