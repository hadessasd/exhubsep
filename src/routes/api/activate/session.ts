import { createFileRoute } from "@tanstack/react-router";
import {
  classifyProductKey,
  ensurePaymentFromStripeApi,
  markSerialConsumed,
  attachServiceToken,
  publicSiteOrigin,
} from "@/lib/server/stripe-payments";
import {
  createServiceProject,
  getProjectBySession,
  resolveDeliveryAssets,
  resolveDeliveryAssetsBothOs,
} from "@/lib/server/delivery";
import {
  issuePurchaseAuthKey,
  listMachinesByStripeSession,
  json,
  jsonError,
  whitelistCategoryFromProductKey,
} from "@/lib/server/whitelist";

function tierFromKey(
  productKey: string,
  classification: ReturnType<typeof classifyProductKey>,
): string {
  if (classification.tier) return classification.tier;
  if (classification.kind === "proctor" || classification.kind === "tools") {
    return "standard";
  }
  const k = productKey.toLowerCase();
  // Avoid matching "pro" inside "proctor"
  if (/(^|-)premium($|-)/.test(k) || k.endsWith("premium")) return "premium";
  if (/(^|-)pro($|-)/.test(k) || k === "pro") return "pro";
  if (/(^|-)standard($|-)/.test(k) || k === "standard") return "standard";
  return "standard";
}


function mapDeliveryAssets(
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

export const Route = createFileRoute("/api/activate/session")({
  server: {
    handlers: {
      /** Validate paid session + return flow type */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const sessionId = url.searchParams.get("session_id")?.trim();
          if (!sessionId) return jsonError("session_id required", 400);

          const payment = await ensurePaymentFromStripeApi(sessionId);
          if (!payment || payment.status !== "paid") {
            return jsonError(
              "Payment not verified yet. Wait a moment and refresh.",
              402,
            );
          }

          const classification = classifyProductKey(payment.productKey);
          const existingProject =
            classification.flow === "progress"
              ? await getProjectBySession(sessionId)
              : null;

          let machines =
            classification.flow === "progress"
              ? []
              : await listMachinesByStripeSession(sessionId);

          // Software purchases: ensure an active auth code exists (no serial / machine binding)
          let issuedAuthCode: string | null = null;
          if (
            classification.flow === "os_serial" ||
            classification.flow === "proctor_serial"
          ) {
            const hasActiveToken = machines.some(
              (m) => m.sessionToken && m.status !== "blocked",
            );
            // Only auto-issue when product key already identifies a category
            // (bare tier "pro"/"standard" needs exam pick via POST first)
            const bareTier = ["standard", "pro", "premium"].includes(
              (payment.productKey || "").toLowerCase(),
            );
            if (!hasActiveToken && !bareTier) {
              const issued = await issuePurchaseAuthKey({
                productKey: payment.productKey,
                stripeSessionId: sessionId,
                keyName: undefined,
              });
              issuedAuthCode = issued.authCode;
              if (issued.created) {
                try {
                  await markSerialConsumed(sessionId);
                } catch {
                  /* non-fatal — consume tracking is best-effort */
                }
              }
              machines = await listMachinesByStripeSession(sessionId);
            } else if (hasActiveToken) {
              issuedAuthCode =
                machines.find((m) => m.sessionToken)?.sessionToken || null;
            }
          }

          // Resolve delivery from most recent machine or product defaults
          let delivery: Array<{
            label: string;
            fileUrl: string | null;
            message: string | null;
            steps: string | null;
            instructions?: string | null;
            fileName?: string | null;
            hasUpload?: boolean;
          }> = [];
          if (machines[0]) {
            const m = machines[0];
            const pk = m.productKey || payment.productKey;
            const cls = classifyProductKey(pk);
            const assets = await resolveDeliveryAssets({
              productKey: pk,
              exam: cls.exam,
              tier: cls.tier || tierFromKey(pk, cls),
              os: m.os,
              kind: cls.kind,
            });
            delivery = assets.map((a) => ({
              label: a.label,
              fileUrl: a.hasFileBlob
                ? `/api/delivery/file/${a.id}`
                : a.fileUrl || a.externalUrl,
              message: a.message,
              steps: a.steps,
              instructions: a.instructions,
              fileName: a.fileName,
              hasUpload: a.hasFileBlob,
            }));
          } else if (classification.flow === "proctor_serial") {
            const assets = await resolveDeliveryAssets({
              productKey: payment.productKey,
              kind: "proctor",
            });
            delivery = assets.map((a) => ({
              label: a.label,
              fileUrl: a.hasFileBlob
                ? `/api/delivery/file/${a.id}`
                : a.fileUrl || a.externalUrl,
              message: a.message,
              steps: a.steps,
              instructions: a.instructions,
              fileName: a.fileName,
              hasUpload: a.hasFileBlob,
            }));
          } else if (classification.flow === "os_serial") {
            // Pre-show delivery for exam products even before serial (download after activate)
            const assets = await resolveDeliveryAssets({
              productKey: payment.productKey,
              exam: classification.exam,
              tier: classification.tier || tierFromKey(payment.productKey, classification),
              kind: classification.kind,
            });
            delivery = assets.map((a) => ({
              label: a.label,
              fileUrl: a.hasFileBlob
                ? `/api/delivery/file/${a.id}`
                : a.fileUrl || a.externalUrl,
              message: a.message,
              steps: a.steps,
              instructions: a.instructions,
              fileName: a.fileName,
              hasUpload: a.hasFileBlob,
            }));
          }

          // Also resolve both OS packs so the UI can offer macOS + Windows downloads
          let deliveryByOs: {
            macos: ReturnType<typeof mapDeliveryAssets>;
            windows: ReturnType<typeof mapDeliveryAssets>;
          } = { macos: [], windows: [] };
          if (classification.flow !== "progress") {
            const both = await resolveDeliveryAssetsBothOs({
              productKey: payment.productKey,
              exam: classification.exam,
              tier:
                classification.tier ||
                tierFromKey(payment.productKey, classification),
              kind: classification.kind,
            });
            deliveryByOs = {
              macos: mapDeliveryAssets(both.macos),
              windows: mapDeliveryAssets(both.windows),
            };
            if (!delivery.length) {
              delivery = [
                ...deliveryByOs.macos,
                ...deliveryByOs.windows.filter(
                  (w) => !deliveryByOs.macos.some((m) => m.scopeKey === w.scopeKey),
                ),
              ];
            }
          }

          return json({
            ok: true,
            payment: {
              sessionId: payment.sessionId,
              amountCents: payment.amountCents,
              productKey: payment.productKey,
              productLabel: payment.productLabel,
              email: payment.customerEmail,
              consumeCount: payment.consumeCount,
              maxSerials: payment.maxSerials,
              remainingSerials: Math.max(
                0,
                payment.maxSerials - payment.consumeCount,
              ),
            },
            classification,
            existingProject: existingProject
              ? {
                  token: existingProject.publicToken,
                  progress: existingProject.progress,
                  status: existingProject.status,
                  progressUrl: `${publicSiteOrigin(request)}/progress/${existingProject.publicToken}`,
                }
              : null,
            existingMachines: machines.map((m) => ({
              id: m.id,
              keyName: m.keyName,
              status: m.status,
              os: m.os,
              productKey: m.productKey,
              authCode: m.sessionToken,
            })),
            authCode:
              issuedAuthCode ||
              machines.find((m) => m.sessionToken)?.sessionToken ||
              null,
            delivery,
            deliveryByOs,
          });
        } catch (err) {
          return jsonError(err, 400);
        }
      },

      /** Issue auth code (software) or create progress project */
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            sessionId?: string;
            action?: "issue_auth" | "register_serial" | "create_project";
            os?: "macos" | "windows";
            serial?: string;
            exam?: "sat" | "act" | "gmat" | "gre";
            keyName?: string;
            contactMethod?: string;
            contactValue?: string;
            notes?: string;
            productKeyOverride?: string;
          };

          const sessionId = body.sessionId?.trim();
          if (!sessionId) return jsonError("sessionId required", 400);

          const payment = await ensurePaymentFromStripeApi(sessionId);
          if (!payment || payment.status !== "paid") {
            return jsonError("Payment not verified", 402);
          }

          let productKey = body.productKeyOverride || payment.productKey;
          // If payment is bare tier, combine with exam choice
          if (
            body.exam &&
            ["standard", "pro", "premium"].includes(productKey)
          ) {
            productKey = `${body.exam}-${productKey}`;
          }

          const classification = classifyProductKey(productKey);
          const action =
            body.action ||
            (classification.flow === "progress"
              ? "create_project"
              : "issue_auth");

          if (action === "create_project") {
            const existing = await getProjectBySession(sessionId);
            if (existing) {
              return json({
                ok: true,
                project: existing,
                progressUrl: `${publicSiteOrigin(request)}/progress/${existing.publicToken}`,
              });
            }
            if (!body.contactMethod?.trim() || !body.contactValue?.trim()) {
              return jsonError("Contact method and value required", 400);
            }
            const kind =
              classification.kind === "internship" ? "internship" : "research";
            const project = await createServiceProject({
              kind,
              stripeSessionId: sessionId,
              contactMethod: body.contactMethod,
              contactValue: body.contactValue,
              title: `${kind} · ${payment.customerEmail || "buyer"}`,
              notes: body.notes,
            });
            await attachServiceToken(sessionId, project.publicToken);
            return json({
              ok: true,
              project,
              progressUrl: `${publicSiteOrigin(request)}/progress/${project.publicToken}`,
            });
          }

          // issue_auth — Stripe paid → active auth code (no serial / machine binding)
          // `register_serial` kept as alias for older clients; serial is ignored.
          if (action !== "issue_auth" && action !== "register_serial") {
            return jsonError("Unknown action", 400);
          }

          const whitelistCategory = whitelistCategoryFromProductKey(productKey);
          const os = body.os === "windows" ? "windows" : body.os === "macos" ? "macos" : null;
          const exam =
            body.exam ||
            classification.exam ||
            (productKey.startsWith("act")
              ? "act"
              : productKey.startsWith("gmat")
                ? "gmat"
                : productKey.startsWith("gre")
                  ? "gre"
                  : productKey.startsWith("sat")
                    ? "sat"
                    : null);
          const tier = tierFromKey(productKey, classification);
          const labelKind = (
            exam ||
            classification.kind ||
            "exam"
          ).toUpperCase();
          const keyName =
            body.keyName?.trim() ||
            (classification.kind === "proctor" || classification.kind === "tools"
              ? `${labelKind} · paid auth code`
              : `${labelKind} ${tier} · paid auth code`);

          const issued = await issuePurchaseAuthKey({
            productKey: whitelistCategory,
            stripeSessionId: sessionId,
            os,
            keyName,
            note: `Stripe purchase · product ${productKey} · category ${whitelistCategory} · auth-key only (no serial)`,
          });

          if (issued.created) {
            try {
              await markSerialConsumed(sessionId);
            } catch {
              /* best-effort */
            }
          }

          const assets = await resolveDeliveryAssets({
            productKey,
            exam,
            tier,
            os: os || undefined,
            kind: classification.kind,
          });

          const both = await resolveDeliveryAssetsBothOs({
            productKey,
            exam,
            tier,
            kind: classification.kind,
          });

          return json({
            ok: true,
            machine: {
              id: issued.row.id,
              keyName: issued.row.keyName,
              status: "active",
              os: os || issued.row.os || "—",
              productKey,
              whitelistCategory,
            },
            authCode: issued.authCode,
            delivery: mapDeliveryAssets(assets),
            deliveryByOs: {
              macos: mapDeliveryAssets(both.macos),
              windows: mapDeliveryAssets(both.windows),
            },
            remainingSerials: 0,
            message:
              "Auth code ready. Enter it in the ExamHub app — no serial registration.",
          });
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
