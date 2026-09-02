import { createFileRoute } from "@tanstack/react-router";
import { upsertPaidSession } from "@/lib/server/stripe-payments";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
        const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
        const body = await request.text();

        try {
          let event: {
            type: string;
            data: { object: Record<string, unknown> };
          };

          if (secret && apiKey) {
            const Stripe = (await import("stripe")).default;
            const stripe = new Stripe(apiKey);
            const sig = request.headers.get("stripe-signature");
            if (!sig) {
              return new Response(JSON.stringify({ error: "Missing signature" }), {
                status: 400,
                headers: { "content-type": "application/json" },
              });
            }
            const constructed = stripe.webhooks.constructEvent(
              body,
              sig,
              secret,
            );
            event = constructed as unknown as typeof event;
          } else {
            // Dev / missing secrets: accept JSON body (never use in production without secret)
            event = JSON.parse(body);
          }

          if (event.type === "checkout.session.completed") {
            const session = event.data.object as {
              id: string;
              payment_status?: string;
              status?: string;
              amount_total?: number | null;
              currency?: string | null;
              client_reference_id?: string | null;
              payment_intent?: string | { id: string } | null;
              customer_details?: { email?: string | null } | null;
              customer_email?: string | null;
              metadata?: Record<string, string> | null;
              mode?: string;
            };

            const paid =
              session.payment_status === "paid" ||
              session.status === "complete";
            if (paid && session.id) {
              const pi =
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.payment_intent?.id ?? null;
              const productKey =
                session.client_reference_id ||
                session.metadata?.product_key ||
                undefined;
              await upsertPaidSession({
                sessionId: session.id,
                paymentIntent: pi,
                amountCents: session.amount_total ?? 0,
                currency: session.currency ?? "usd",
                productKey,
                productLabel: session.metadata?.product_label ?? null,
                customerEmail:
                  session.customer_details?.email ||
                  session.customer_email ||
                  null,
                meta: {
                  mode: session.mode,
                  metadata: session.metadata,
                },
              });
            }
          }

          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Webhook error";
          console.error("[stripe webhook]", msg);
          return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
