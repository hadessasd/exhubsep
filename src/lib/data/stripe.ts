/** Stripe Buy Button + Payment Link config for ExamHub (live). */

export const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51SVWlBDXixO7DEDLrWCRJTGJ7dezGlppF6yfnU6FxJzPH3Cuu08OkXDtdVh837yvodbI6E5YXsNJzcQkKJ2WGKVL001V8Pkkle";

/** Tiered exam products (SAT/ACT Standard · Pro · Premium) — Buy Button IDs */
export const STRIPE_BUY_BUTTONS = {
  standard: "buy_btn_1U2qctDXixO7DEDLgrh7ajN7", // $190
  pro: "buy_btn_1U2qUYDXixO7DEDL6viNlsYe", // $450
  premium: "buy_btn_1U2qbuDXixO7DEDLIpsaWnrF", // $890
  research: "buy_btn_1U2qdrDXixO7DEDLZjX0gBav", // $800
  internship: "buy_btn_1U2qegDXixO7DEDLgMe10dLj", // $750
} as const;

/**
 * Live Stripe Payment Links (buy.stripe.com) — preferred checkout path.
 * Same three links map to Standard / Pro / Premium tiers for SAT & ACT.
 * GMAT / GRE use empty placeholders until admin pastes links (see product_payment_links).
 */
export const STRIPE_PAYMENT_LINKS = {
  standard: "https://buy.stripe.com/8x27sL3mm6ht9k1eqY83C03", // $190
  pro: "https://buy.stripe.com/6oUeVdbSSaxJdAhbeM83C00", // $450
  premium: "https://buy.stripe.com/00w3cv7CC8pB9k12Ig83C02", // $890
  /** Research / internship keep buy-button flow; no dedicated Payment Link yet */
  research: "",
  internship: "",
} as const;

export type StripeBuyKey = keyof typeof STRIPE_BUY_BUTTONS;
export type StripeTier = "standard" | "pro" | "premium";

export function stripeButtonForTier(
  tier: StripeTier | undefined,
): string | undefined {
  if (!tier) return undefined;
  return STRIPE_BUY_BUTTONS[tier];
}

export function stripePaymentLinkForTier(
  tier: StripeTier | undefined,
): string | undefined {
  if (!tier) return undefined;
  const url = STRIPE_PAYMENT_LINKS[tier];
  return url?.trim() ? url.trim() : undefined;
}

/** Append client_reference_id so webhook / activate can map the purchase. */
export function withStripeClientReference(
  paymentLinkUrl: string,
  productKey: string,
): string {
  const base = paymentLinkUrl.trim();
  if (!base) return "";
  try {
    const u = new URL(base);
    u.searchParams.set("client_reference_id", productKey);
    return u.toString();
  } catch {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}client_reference_id=${encodeURIComponent(productKey)}`;
  }
}
