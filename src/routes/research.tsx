import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import {
  RESEARCH_BASE_USD,
  RESEARCH_OPTIONS,
  RESEARCH_SUBJECTS,
  getProductBySlug,
} from "@/lib/data/catalog";
import { formatUsd } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { useEffect } from "react";

export const Route = createFileRoute("/research")({
  component: ResearchPage,
  head: () => ({
    meta: [
      {
        title: "Research Paper Package $800 | Crypto — ExamHub",
      },
      {
        name: "description",
        content:
          "Flat $800 research paper package. Pay with Solana, USDC, ETH, Litecoin or a G2A crypto voucher.",
      },
    ],
  }),
});

function ResearchPage() {
  const { isAdmin } = Route.useRouteContext();

  useEffect(() => {
    try {
      localStorage.setItem(
        "examhub.last_checkout",
        JSON.stringify({
          productId: "research",
          name: "Research paper",
          priceUsd: RESEARCH_BASE_USD,
          at: Date.now(),
        }),
      );
      document.cookie = `examhub_last_product=research; path=/; max-age=${30 * 86400}; SameSite=Lax`;
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Badge className="mb-2">Research · {formatUsd(RESEARCH_BASE_USD)}</Badge>
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
          Research paper package
        </h1>
        <p className="mt-2 text-fg-muted">
          Flat {formatUsd(RESEARCH_BASE_USD)}. Pay with crypto or a G2A voucher,
          leave contact, and the order stays pending until admin completes it.
        </p>

        <div className="mt-8">
          <CheckoutForm product={getProductBySlug("research")!} />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Already submitted?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-fg-muted">
            <Link
              to="/orders"
              className="font-semibold text-primary hover:underline"
            >
              Open your orders
            </Link>
            {" · "}
            <Link
              to="/login"
              className="font-semibold text-primary hover:underline"
            >
              Optional login
            </Link>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Subjects & free options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-fg-muted">
              Subjects: {RESEARCH_SUBJECTS.slice(0, 12).join(", ")}
              {RESEARCH_SUBJECTS.length > 12 ? "…" : ""}
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {RESEARCH_OPTIONS.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border border-border bg-bg-soft/50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-fg">{o.label}</span>
                  {o.description ? (
                    <span className="mt-0.5 block text-xs text-muted">
                      {o.description}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
