import { createFileRoute } from "@tanstack/react-router";
import {
  listPaymentLinks,
  upsertPaymentLink,
} from "@/lib/server/payment-links";
import {
  json,
  jsonError,
  requireAdminFromRequest,
} from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/admin/payment-links")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const links = await listPaymentLinks();
          return json({ links });
        } catch (err) {
          return jsonError(err, 403);
        }
      },
      POST: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const body = (await request.json()) as {
            productKey?: string;
            label?: string | null;
            examFamily?: string | null;
            tier?: string | null;
            paymentLinkUrl?: string;
            buyButtonId?: string | null;
            notes?: string | null;
          };
          if (!body.productKey?.trim()) {
            return jsonError("productKey required", 400);
          }
          const link = await upsertPaymentLink({
            productKey: body.productKey,
            label: body.label,
            examFamily: body.examFamily,
            tier: body.tier,
            paymentLinkUrl: body.paymentLinkUrl ?? "",
            buyButtonId: body.buyButtonId,
            notes: body.notes,
          });
          return json(link);
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
