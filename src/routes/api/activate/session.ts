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
} from "@/lib/server/delivery";
import {
  upsertMachine,
  findMachineByInput,
  listMachinesByStripeSession,
  clientIp,
  json,
  jsonError,
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

          const machines =
            classification.flow === "progress"
              ? []
              : await listMachinesByStripeSession(sessionId);

          // Resolve delivery from most recent machine or product defaults
          let delivery: Array<{
            label: string;
            fileUrl: string | null;
            message: string | null;
            steps: string | null;
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
              fileUrl: a.fileUrl,
              message: a.message,
              steps: a.steps,
            }));
          } else if (classification.flow === "proctor_serial") {
            const assets = await resolveDeliveryAssets({
              productKey: payment.productKey,
              kind: "proctor",
            });
            delivery = assets.map((a) => ({
              label: a.label,
              fileUrl: a.fileUrl,
              message: a.message,
              steps: a.steps,
            }));
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
            })),
            delivery,
          });
        } catch (err) {
          return jsonError(err, 400);
        }
      },

      /** Register serial (SAT/ACT/proctor) or create progress project */
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            sessionId?: string;
            action?: "register_serial" | "create_project";
            os?: "macos" | "windows";
            serial?: string;
            exam?: "sat" | "act";
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
              : "register_serial");

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

          // register_serial — Stripe paid → status active (auto-whitelist)
          const serial = body.serial?.trim();
          if (!serial) return jsonError("Serial number required", 400);

          // A serial belongs to one paid activation. Retrying the same session is
          // safe/idempotent; a different paid session cannot silently steal it.
          const alreadyRegistered = await findMachineByInput(serial);
          if (
            alreadyRegistered?.stripeSessionId &&
            alreadyRegistered.stripeSessionId !== sessionId
          ) {
            return jsonError("This serial is already registered to another purchase", 409);
          }
          const samePaidActivation =
            alreadyRegistered?.stripeSessionId === sessionId &&
            alreadyRegistered.status === "active";
          if (!samePaidActivation && payment.consumeCount >= payment.maxSerials) {
            return jsonError(
              `This payment already registered ${payment.maxSerials} machine(s)`,
              400,
            );
          }

          const os = body.os === "windows" ? "windows" : "macos";
          const exam =
            body.exam ||
            classification.exam ||
            (productKey.startsWith("act")
              ? "act"
              : productKey.startsWith("sat")
                ? "sat"
                : null);
          const tier = tierFromKey(productKey, classification);

          const note = `Serial stored as SHA-256 only\nOS: ${os}\nProduct: ${productKey}\nSource: stripe (auto-active)`;
          const labelKind = (
            exam ||
            classification.kind ||
            "exam"
          ).toUpperCase();
          const keyName =
            body.keyName?.trim() ||
            (classification.kind === "proctor" || classification.kind === "tools"
              ? `${labelKind} · ${os} · paid`
              : `${labelKind} ${tier} · ${os} · paid`);

          const machine = await upsertMachine({
            keyName,
            machineInput: serial,
            hostname: os,
            note,
            status: "active",
            forever: true,
            os,
            lastIp: await clientIp(request),
            productKey,
            source: "stripe",
            stripeSessionId: sessionId,
            rawSerialNote: null,
          });

          if (!samePaidActivation) {
            await markSerialConsumed(sessionId);
          }

          const assets = await resolveDeliveryAssets({
            productKey,
            exam,
            tier,
            os,
            kind: classification.kind,
          });

          return json({
            ok: true,
            machine: {
              id: machine.id,
              keyName: machine.keyName,
              status: "active",
              os,
              productKey,
            },
            delivery: assets.map((a) => ({
              label: a.label,
              fileUrl: a.fileUrl,
              message: a.message,
              steps: a.steps,
            })),
            remainingSerials: Math.max(
              0,
              payment.maxSerials - payment.consumeCount - (samePaidActivation ? 0 : 1),
            ),
          });
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
