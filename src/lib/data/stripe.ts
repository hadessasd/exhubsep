/** Stripe Buy Button config for ExamHub (live). */

export const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51SVWlBDXixO7DEDLrWCRJTGJ7dezGlppF6yfnU6FxJzPH3Cuu08OkXDtdVh837yvodbI6E5YXsNJzcQkKJ2WGKVL001V8Pkkle";

/** Tiered exam products (SAT/ACT Standard · Pro · Premium) */
export const STRIPE_BUY_BUTTONS = {
  standard: "buy_btn_1U2qctDXixO7DEDLgrh7ajN7", // $190
  pro: "buy_btn_1U2qUYDXixO7DEDL6viNlsYe", // $450
  premium: "buy_btn_1U2qbuDXixO7DEDLIpsaWnrF", // $890
  research: "buy_btn_1U2qdrDXixO7DEDLZjX0gBav", // $800
  internship: "buy_btn_1U2qegDXixO7DEDLgMe10dLj", // $750
} as const;

export type StripeBuyKey = keyof typeof STRIPE_BUY_BUTTONS;

export function stripeButtonForTier(
  tier: "standard" | "pro" | "premium" | undefined,
): string | undefined {
  if (!tier) return undefined;
  return STRIPE_BUY_BUTTONS[tier];
}
