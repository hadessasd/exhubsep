import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import type { Product } from "@/lib/data/catalog";
import { formatUsd } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="card-hover flex h-full flex-col overflow-hidden">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {product.category === "proctoring"
                ? "Proctor tool"
                : product.category.toUpperCase()}
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-fg">
              {product.name}
            </h3>
          </div>
          {product.badge ? <Badge variant="accent">{product.badge}</Badge> : null}
        </div>
        <p className="text-sm leading-relaxed text-fg-muted">
          {product.shortDescription}
        </p>
        <ul className="space-y-1.5">
          {product.features.slice(0, 3).map((f) => (
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
            <Button size="sm">
              View
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
