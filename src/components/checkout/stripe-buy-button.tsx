import { useEffect, useRef } from "react";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/data/stripe";

/**
 * Renders Stripe's official buy-button web component.
 * clientReferenceId becomes checkout.session.client_reference_id (product key).
 */
export function StripeBuyButton({
  buyButtonId,
  clientReferenceId,
  className,
}: {
  buyButtonId: string;
  /** Product slug / key stored on the Checkout Session */
  clientReferenceId?: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document.querySelector("script[data-examhub-stripe-buy]")) {
      const s = document.createElement("script");
      s.src = "https://js.stripe.com/v3/buy-button.js";
      s.async = true;
      s.dataset.examhubStripeBuy = "1";
      document.body.appendChild(s);
    }

    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";
    const el = document.createElement("stripe-buy-button");
    el.setAttribute("buy-button-id", buyButtonId);
    el.setAttribute("publishable-key", STRIPE_PUBLISHABLE_KEY);
    if (clientReferenceId) {
      el.setAttribute("client-reference-id", clientReferenceId);
    }
    host.appendChild(el);
  }, [buyButtonId, clientReferenceId]);

  return (
    <div
      ref={hostRef}
      className={className ?? "w-full min-h-[44px] overflow-hidden"}
    />
  );
}
