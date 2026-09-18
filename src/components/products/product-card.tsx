import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import type { Product } from "@/lib/data/catalog";
import { formatUsd } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  featured = false,
}: {
  product: Product;
  featured?: boolean;
}) {
  return (
    <Card
      className={cn(
        "card-hover comic-panel flex h-full flex-col overflow-hidden border-border-strong",
        featured &&
          "bg-gradient-to-br from-surface via-accent-soft/30 to-primary-soft/50",
      )}
    >
      <CardContent
        className={cn(
          "flex h-full flex-col gap-4",
          featured ? "p-6 sm:p-7" : "p-5",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            {featured ? (
              <span className="comic-sticker mb-2 inline-flex">Campus pick</span>
            ) : null}
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
              {product.category === "proctoring"
                ? "Proctor tool"
                : product.category.toUpperCase()}
            </p>
            <h3
              className={cn(
                "mt-1 font-display font-semibold text-fg",
                featured ? "text-xl sm:text-2xl" : "text-lg",
              )}
            >
              {product.name}
            </h3>
          </div>
          {product.badge ? <Badge variant="accent">{product.badge}</Badge> : null}
        </div>
        <p className="text-sm leading-relaxed text-fg-muted">
          {product.shortDescription}
        </p>
        <ul className="space-y-1.5">
          {product.features.slice(0, featured ? 5 : 3).map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-fg-muted">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="text-xs text-muted">From</p>
            <p className="font-display text-2xl font-bold text-fg">
              {formatUsd(product.priceUsd)}
            </p>
          </div>
          <Link to="/products/$slug" params={{ slug: product.slug }}>
            <Button size={featured ? "default" : "sm"}>
              View
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
