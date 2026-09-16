import { createFileRoute } from "@tanstack/react-router";
import {
  deleteDeliveryAsset,
  listDeliveryAssets,
  upsertDeliveryAsset,
  DELIVERY_SCOPE_PRESETS,
  deliveryDownloadPath,
} from "@/lib/server/delivery";
import {
  json,
  jsonError,
  requireAdminFromRequest,
} from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/admin/delivery")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const assets = await listDeliveryAssets();
          return json({
            assets: assets.map((a) => ({
              ...a,
              downloadPath: a.hasFileBlob ? deliveryDownloadPath(a.id) : null,
            })),
            presets: DELIVERY_SCOPE_PRESETS,
          });
        } catch (err) {
          return jsonError(err, 403);
        }
      },
      POST: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const body = (await request.json()) as {
            scopeKey?: string;
            label?: string;
            category?: string | null;
            tier?: string | null;
            os?: string | null;
            fileUrl?: string | null;
            externalUrl?: string | null;
            message?: string | null;
            steps?: string | null;
            instructions?: string | null;
            fileName?: string | null;
            fileMime?: string | null;
            fileData?: string | null;
            clearFileBlob?: boolean;
            deleteId?: string;
          };
          if (body.deleteId) {
            await deleteDeliveryAsset(body.deleteId);
            return json({ ok: true });
          }
          if (!body.scopeKey?.trim() || !body.label?.trim()) {
            return jsonError("scopeKey and label required", 400);
          }
          const asset = await upsertDeliveryAsset({
            scopeKey: body.scopeKey,
            label: body.label,
            category: body.category,
            tier: body.tier,
            os: body.os,
            fileUrl: body.fileUrl,
            externalUrl: body.externalUrl ?? body.fileUrl,
            message: body.message,
            steps: body.steps,
            instructions: body.instructions,
            fileName: body.fileName,
            fileMime: body.fileMime,
            fileData: body.fileData,
            clearFileBlob: body.clearFileBlob,
          });
          return json({
            ...asset,
            downloadPath: asset.hasFileBlob
              ? deliveryDownloadPath(asset.id)
              : null,
          });
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
