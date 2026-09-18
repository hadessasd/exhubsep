import { createFileRoute } from "@tanstack/react-router";
import {
  attachServiceToken,
  markSerialConsumed,
  productKeyFromAmount,
  publicSiteOrigin,
  upsertPaidSession} from "@/lib/server/stripe-payments";
import {
  createServiceProject,
  resolveDeliveryAssets} from "@/lib/server/delivery";
import {
  json,
  jsonError,
  requireAdminFromRequest,
  issuePurchaseAuthKey,
  whitelistCategoryFromProductKey,
} from "@/lib/server/whitelist";
import { randomBytes } from "node:crypto";

const PRODUCT_PRESETS: Record<
  string,
  { amountCents: number; productKey: string; label: string }
> = {
  standard: {
    amountCents: 19000,
    productKey: "standard",
    label: "SAT/ACT Standard $190"},
  pro: { amountCents: 45000, productKey: "pro", label: "SAT/ACT Pro $450" },
  premium: {
    amountCents: 89000,
    productKey: "premium",
    label: "SAT/ACT Premium $890"},
  research: {
    amountCents: 80000,
    productKey: "research",
    label: "Research paper $800"},
  internship: {
    amountCents: 75000,
    productKey: "internship",
    label: "Internship $750"},
  proctor: {
    amountCents: 19000,
    productKey: "proctor-honorlock",
    label: "Proctor tool $190"}};

export const Route = createFileRoute("/api/admin/simulate")({
  server: {
    handlers: {
      /** List presets for the sim UI */
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          return json({
            presets: Object.entries(PRODUCT_PRESETS).map(([id, p]) => ({
              id,
              ...p}))});
        } catch (err) {
          return jsonError(err, 403);
        }
      },

      /**
       * Create a fake paid Stripe session (no real charge).
       * Optionally complete OS+serial whitelist or research/internship project.
       */
      POST: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const body = (await request.json()) as {
            product?: string;
            email?: string;
            /** payment_only | whitelist | progress */
            action?: "payment_only" | "whitelist" | "progress";
            os?: "macos" | "windows";
            serial?: string;
            exam?: "sat" | "act" | "gre" | "gmat";
            contactMethod?: string;
            contactValue?: string;
            notes?: string;
            keyName?: string;
          };

          const productId = (body.product || "standard").toLowerCase();
          const preset =
            PRODUCT_PRESETS[productId] ||
            PRODUCT_PRESETS[
              productKeyFromAmount(
                Number(
                  (body as { amountCents?: number }).amountCents || 19000,
                ),
              )
            ] ||
            PRODUCT_PRESETS.standard!;

          const sessionId = `cs_sim_${Date.now()}_${randomBytes(4).toString("hex")}`;
          const email =
            body.email?.trim() || "sim@examhub.local";

          const payment = await upsertPaidSession({
            sessionId,
            paymentIntent: `pi_sim_${randomBytes(6).toString("hex")}`,
            amountCents: preset.amountCents,
            currency: "usd",
            productKey: preset.productKey,
            productLabel: `[SIM] ${preset.label}`,
            customerEmail: email,
            meta: {
              simulated: true,
              productPreset: productId,
              createdBy: "admin-sim"}});

          const origin = publicSiteOrigin(request);
          const activateUrl = `${origin}/activate?session_id=${encodeURIComponent(sessionId)}`;
          const action = body.action || "payment_only";

          // --- Full whitelist (SAT/ACT/proctor) ---
          if (action === "whitelist") {
            const os = body.os === "windows" ? "windows" : body.os === "macos" ? "macos" : null;
            const exam = body.exam === "act" ? "act" : body.exam === "gre" ? "gre" : body.exam === "gmat" ? "gmat" : "sat";
            let productKey = preset.productKey;
            if (["standard", "pro", "premium"].includes(productKey)) {
              productKey = `${exam}-${productKey}`;
            }
            const tier = productKey.includes("premium")
              ? "premium"
              : productKey.includes("pro") && !productKey.includes("proctor")
                ? "pro"
                : productKey.includes("standard")
                  ? "standard"
                  : "pro";
            const category = whitelistCategoryFromProductKey(productKey);
            const keyName =
              body.keyName?.trim() ||
              `[SIM] ${category.toUpperCase()} ${tier} · auth code`;

            const issued = await issuePurchaseAuthKey({
              productKey: category,
              stripeSessionId: sessionId,
              os,
              keyName,
              note: `Simulated Stripe purchase · ${productKey} · auth-key only`});
            if (issued.created) {
              try {
                await markSerialConsumed(sessionId);
              } catch {
                /* ignore */
              }
            }
            const assets = await resolveDeliveryAssets({
              productKey,
              exam: productKey.startsWith("proctor") ? null : exam,
              tier,
              os: os || undefined,
              kind: productKey.startsWith("proctor") ? "proctor" : "exam"});
            return json({
              ok: true,
              simulated: true,
              action: "whitelist",
              payment,
              activateUrl,
              machine: {
                id: issued.row.id,
                keyName: issued.row.keyName,
                status: "active",
                productKey: category},
              authCode: issued.authCode,
              delivery: assets.map((a) => ({
                label: a.label,
                fileUrl: a.hasFileBlob
                  ? `/api/delivery/file/${a.id}`
                  : a.fileUrl || a.externalUrl,
                message: a.message,
                steps: a.steps})),
              message:
                "Simulated paid session + active auth code. Check Machines → Active auth codes (source: stripe)."});
          }

          if (action === "progress") {
            const kind =
              preset.productKey === "internship" ? "internship" : "research";
            const project = await createServiceProject({
              kind,
              stripeSessionId: sessionId,
              contactMethod: body.contactMethod?.trim() || "email",
              contactValue: body.contactValue?.trim() || email,
              title: `[SIM] ${kind} · ${email}`,
              notes: body.notes?.trim() || "Admin simulation"});
            await attachServiceToken(sessionId, project.publicToken);
            const progressUrl = `${origin}/progress/${project.publicToken}`;
            return json({
              ok: true,
              simulated: true,
              payment: {
                sessionId: payment.sessionId,
                productKey: payment.productKey,
                amountCents: payment.amountCents,
                email: payment.customerEmail},
              activateUrl,
              project: {
                id: project.id,
                token: project.publicToken,
                kind: project.kind,
                progress: project.progress,
                status: project.status},
              progressUrl});
          }

          // --- Payment only: open /activate as buyer would after Stripe ---
          return json({
            ok: true,
            simulated: true,
            payment: {
              sessionId: payment.sessionId,
              productKey: payment.productKey,
              amountCents: payment.amountCents,
              email: payment.customerEmail},
            activateUrl,
            hint:
              "Open activateUrl as the buyer. Software purchases auto-issue an auth code; research/internship need contact."});
        } catch (err) {
          return jsonError(err, 400);
        }
      }}}});
