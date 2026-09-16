import { createFileRoute } from "@tanstack/react-router";
import { listPublicShowcaseVideos } from "@/lib/server/showcase-videos";
import { json, jsonError } from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/showcase-videos")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const videos = await listPublicShowcaseVideos();
          return json({ ok: true, videos });
        } catch (err) {
          return jsonError(err, 500);
        }
      },
    },
  },
});
