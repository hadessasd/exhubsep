import { useEffect, useState } from "react";
import { ExternalLink, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StripeBuyButton } from "@/components/checkout/stripe-buy-button";
import {
  withStripeClientReference,
  stripePaymentLinkForTier,
} from "@/lib/data/stripe";
import type { Product } from "@/lib/data/catalog";

/**
 * Preferred checkout: Stripe Payment Link (buy.stripe.com).
 * Falls back to Buy Button when a link is not configured.
 */
export function StripePaymentCheckout({ product }: { product: Product }) {
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [source, setSource] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/payment-links/${encodeURIComponent(product.slug)}`);
        if (res.ok) {
          const data = (await res.json()) as {
            checkoutUrl?: string;
            url?: string;
            configured?: boolean;
            source?: string;
            stripeBuyButtonId?: string | null;
          };
          if (cancelled) return;
          setCheckoutUrl(data.checkoutUrl || data.url || "");
          setConfigured(Boolean(data.configured));
          setSource(data.source || "");
          return;
        }
      } catch {
        /* fall through to catalog defaults */
      }
      if (cancelled) return;
      const tierLink =
        product.stripePaymentLinkUrl?.trim() ||
        (product.tier ? stripePaymentLinkForTier(product.tier) : undefined) ||
        "";
      setCheckoutUrl(
        tierLink ? withStripeClientReference(tierLink, product.id) : "",
      );
      setConfigured(Boolean(tierLink));
      setSource(tierLink ? "catalog" : "empty");
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [product.id, product.slug, product.stripePaymentLinkUrl, product.tier]);

  if (configured === null) {
    return (
      <p className="text-sm text-fg-muted">Loading Stripe checkout…</p>
    );
  }

  if (checkoutUrl) {
    return (
      <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary-soft/40 p-4">
        <p className="text-sm text-fg-muted">
          Pay securely with Stripe. After payment you&apos;ll land on{" "}
          <strong>/activate</strong> to receive your <strong>auth code</strong>{" "}
          and <strong>app download</strong>.
        </p>
        <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" className="w-full" size="lg">
            <CreditCard className="h-4 w-4" />
            Pay ${product.priceUsd} with Stripe
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
        <p className="text-[11px] text-muted">
          Payment Link · {product.id}
          {source ? ` · ${source}` : ""}
        </p>
      </div>
    );
  }

  if (product.stripeBuyButtonId) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-fg-muted">
          Stripe Buy Button checkout for this product.
        </p>
        <StripeBuyButton
          buyButtonId={product.stripeBuyButtonId}
          clientReferenceId={product.id}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-bg-soft/60 p-4 text-sm text-fg-muted">
      <p className="font-semibold text-fg">Stripe Payment Link not configured</p>
      <p className="mt-1 text-xs">
        Admin can paste a buy.stripe.com link for <code>{product.id}</code> in
        Admin → Delivery → Payment Links. Crypto / gift card checkout still
        works below.
      </p>
    </div>
  );
}
