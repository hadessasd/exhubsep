import { createFileRoute } from "@tanstack/react-router";
import { getShowcaseVideoBlob } from "@/lib/server/showcase-videos";

export const Route = createFileRoute("/api/showcase-videos/file/$category")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const blob = await getShowcaseVideoBlob(params.category);
          if (!blob?.fileData) {
            return new Response("Video not found", { status: 404 });
          }
          const buf = Buffer.from(blob.fileData, "base64");
          const headers = new Headers({
            "content-type": blob.fileMime || "video/mp4",
            "content-length": String(buf.length),
            "cache-control": "public, max-age=300",
            "accept-ranges": "bytes",
          });
          if (blob.fileName) {
            headers.set(
              "content-disposition",
              `inline; filename="${blob.fileName.replace(/"/g, "")}"`,
            );
          }
          return new Response(buf, { status: 200, headers });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Error";
          return new Response(msg, { status: 400 });
        }
      },
    },
  },
});
