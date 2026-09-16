import { createFileRoute } from "@tanstack/react-router";
import { getDeliveryAssetById } from "@/lib/server/delivery";

export const Route = createFileRoute("/api/delivery/file/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const asset = await getDeliveryAssetById(params.id);
          if (!asset?.fileData) {
            return new Response("File not found", { status: 404 });
          }
          const buf = Buffer.from(asset.fileData, "base64");
          const headers = new Headers({
            "content-type": asset.fileMime || "application/octet-stream",
            "content-length": String(buf.length),
            "cache-control": "private, max-age=300",
          });
          if (asset.fileName) {
            headers.set(
              "content-disposition",
              `attachment; filename="${asset.fileName.replace(/"/g, "")}"`,
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
