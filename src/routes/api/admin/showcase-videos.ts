import { createFileRoute } from "@tanstack/react-router";
import {
  clearShowcaseVideo,
  listAdminShowcaseVideos,
  SHOWCASE_CATEGORIES,
  upsertShowcaseVideo,
} from "@/lib/server/showcase-videos";
import {
  json,
  jsonError,
  requireAdminFromRequest,
} from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/admin/showcase-videos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const videos = await listAdminShowcaseVideos();
          return json({
            ok: true,
            categories: [...SHOWCASE_CATEGORIES],
            videos,
          });
        } catch (err) {
          return jsonError(err, 403);
        }
      },
      POST: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const body = (await request.json()) as {
            action?: "save" | "clear";
            category?: string;
            label?: string | null;
            externalUrl?: string | null;
            fileName?: string | null;
            fileMime?: string | null;
            fileData?: string | null;
            clearFileBlob?: boolean;
          };
          if (!body.category?.trim()) {
            return jsonError("category required", 400);
          }
          if (body.action === "clear") {
            await clearShowcaseVideo(body.category);
            return json({ ok: true, cleared: true, category: body.category });
          }
          const video = await upsertShowcaseVideo({
            category: body.category,
            label: body.label,
            externalUrl: body.externalUrl,
            fileName: body.fileName,
            fileMime: body.fileMime,
            fileData: body.fileData,
            clearFileBlob: body.clearFileBlob,
          });
          return json({ ok: true, video });
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
