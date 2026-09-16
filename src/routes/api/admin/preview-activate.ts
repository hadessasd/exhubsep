import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "node:crypto";
import { classifyProductKey } from "@/lib/server/stripe-payments";
import {
  resolveDeliveryAssets,
  resolveDeliveryAssetsBothOs,
} from "@/lib/server/delivery";
import { getProductBySlug, listWhitelistPackages, PRODUCTS } from "@/lib/data/catalog";
import {
  json,
  jsonError,
  requireAdminFromRequest,
} from "@/lib/server/whitelist";

function mapAssets(
  assets: Awaited<ReturnType<typeof resolveDeliveryAssets>>,
) {
  return assets.map((a) => ({
    label: a.label,
    fileUrl: a.hasFileBlob
      ? `/api/delivery/file/${a.id}`
      : a.fileUrl || a.externalUrl,
    message: a.message,
    steps: a.steps,
    instructions: a.instructions,
    fileName: a.fileName,
    hasUpload: a.hasFileBlob,
    scopeKey: a.scopeKey,
    os: a.os,
  }));
}

function tierFromKey(
  productKey: string,
  classification: ReturnType<typeof classifyProductKey>,
): string {
  if (classification.tier) return classification.tier;
  const k = productKey.toLowerCase();
  if (/(^|-)premium($|-)/.test(k) || k.endsWith("premium")) return "premium";
  if (/(^|-)pro($|-)/.test(k) || k === "pro") return "pro";
  if (/(^|-)standard($|-)/.test(k) || k === "standard") return "standard";
  return "standard";
}

/**
 * Admin-only: preview the post-purchase /activate buyer experience for a
 * catalog product. Uses real delivery resolution. Does NOT create Stripe
 * sessions or whitelist rows — auth code is a labeled PREVIEW sample.
 */
export const Route = createFileRoute("/api/admin/preview-activate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const url = new URL(request.url);
          const productKey = (
            url.searchParams.get("productKey") ||
            url.searchParams.get("product_key") ||
            ""
          )
            .trim()
            .toLowerCase();
          const osParam = url.searchParams.get("os")?.trim().toLowerCase();
          const os =
            osParam === "windows" ? "windows" : osParam === "macos" ? "macos" : null;

          if (url.searchParams.get("list") === "1" || !productKey) {
            const packages = listWhitelistPackages().filter(
              (p) => p.id !== "general",
            );
            const extras = PRODUCTS.filter(
              (p) =>
                p.category === "research" || p.category === "internship",
            ).map((p) => ({
              id: p.id,
              label: p.name,
              category: p.category,
            }));
            return json({
              ok: true,
              products: [...packages, ...extras],
            });
          }

          const product = getProductBySlug(productKey);
          const classification = classifyProductKey(productKey);
          const tier = tierFromKey(productKey, classification);
          const exam = classification.exam || null;

          const both = await resolveDeliveryAssetsBothOs({
            productKey,
            exam,
            tier,
            kind: classification.kind,
          });
          const preferredOs = os || "macos";
          const primary = await resolveDeliveryAssets({
            productKey,
            exam,
            tier,
            os: preferredOs,
            kind: classification.kind,
          });

          const previewAuthCode = `PREVIEW_${randomBytes(16).toString("hex")}`;
          const labelKind = (
            exam ||
            classification.kind ||
            "exam"
          ).toUpperCase();
          const keyName =
            classification.kind === "proctor" || classification.kind === "tools"
              ? `${labelKind} · ${preferredOs} · paid`
              : `${labelKind} ${tier} · ${preferredOs} · paid`;

          return json({
            ok: true,
            isPreview: true,
            previewNote:
              "Sample buyer view only. Auth code is PREVIEW-labeled and not a real key. No Stripe session or whitelist row was created.",
            payment: {
              sessionId: "cs_preview_demo",
              amountCents: product ? Math.round(product.priceUsd * 100) : 0,
              productKey,
              productLabel: product?.name || productKey,
              email: "preview-buyer@examhub.local",
              consumeCount: 1,
              maxSerials: 2,
              remainingSerials: 1,
            },
            classification,
            machine: {
              keyName,
              status: "active",
              os: preferredOs,
              productKey,
            },
            authCode: previewAuthCode,
            authCodePreview: true,
            delivery: mapAssets(primary),
            deliveryByOs: {
              macos: mapAssets(both.macos),
              windows: mapAssets(both.windows),
            },
          });
        } catch (err) {
          return jsonError(err, 403);
        }
      },
    },
  },
});
