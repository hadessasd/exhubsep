import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import {
  INTERNSHIP_EXTRAS,
  INTERNSHIP_FIELDS,
  INTERNSHIP_FLAT_USD,
  getProductBySlug,
} from "@/lib/data/catalog";
import { formatUsd } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const Route = createFileRoute("/internships")({
  component: InternshipsPage,
  head: () => ({
    meta: [
      {
        title: "Internship Placement $750 | Crypto — ExamHub",
      },
      {
        name: "description",
        content:
          "Flat $750 internship package. Pay with Solana, USDC, ETH, Litecoin or a G2A crypto voucher.",
      },
    ],
  }),
});

function InternshipsPage() {
  const { isAdmin } = Route.useRouteContext();

  useEffect(() => {
    try {
      localStorage.setItem(
        "examhub.last_checkout",
        JSON.stringify({
          productId: "internship",
          name: "Internship placement",
          priceUsd: INTERNSHIP_FLAT_USD,
          at: Date.now(),
        }),
      );
      document.cookie = `examhub_last_product=internship; path=/; max-age=${30 * 86400}; SameSite=Lax`;
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Badge variant="accent" className="mb-2">
          Internship · {formatUsd(INTERNSHIP_FLAT_USD)} flat
        </Badge>
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
          Internship matching
        </h1>
        <p className="mt-2 text-fg-muted">
          One price. Pay with crypto or a G2A voucher, leave contact, and the
          order stays pending until admin completes it.
        </p>

        <div className="mt-8">
          <CheckoutForm product={getProductBySlug("internship")!} />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Fields & free add-ons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-fg-muted">
              Fields:{" "}
              {INTERNSHIP_FIELDS.map((f) => f.label).slice(0, 10).join(", ")}…
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {INTERNSHIP_EXTRAS.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-border bg-bg-soft/50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-fg">{e.label}</span>
                  <span className="block text-xs text-muted">
                    {e.description} · Free
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
