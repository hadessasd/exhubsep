import { createFileRoute } from "@tanstack/react-router";
import { resolvePaymentLinkForProduct } from "@/lib/server/payment-links";
import { getProductBySlug } from "@/lib/data/catalog";
import { json, jsonError } from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/payment-links/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const product = getProductBySlug(params.slug);
          if (!product) return jsonError("Product not found", 404);
          const resolved = await resolvePaymentLinkForProduct(product.id);
          return json({
            productKey: product.id,
            url: resolved.url,
            checkoutUrl: resolved.checkoutUrl,
            source: resolved.source,
            configured: Boolean(resolved.url),
            stripeBuyButtonId: product.stripeBuyButtonId ?? null,
          });
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
