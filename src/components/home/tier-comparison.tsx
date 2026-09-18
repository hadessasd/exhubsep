import { Check, Crown, Shield, Zap } from "lucide-react";
import type { Product, ProductTier } from "@/lib/data/catalog";
import { formatUsd } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TIER_META: Record<
  ProductTier,
  {
    icon: typeof Shield;
    tone: string;
    bar: string;
    label: string;
    hook: string;
  }
> = {
  standard: {
    icon: Shield,
    tone: "from-surface to-bg-soft/80",
    bar: "bg-fg",
    label: "Standard",
    hook: "Solid sandbox + coverage",
  },
  pro: {
    icon: Zap,
    tone: "from-primary-soft/80 to-accent-soft/50",
    bar: "bg-primary",
    label: "Pro",
    hook: "Score pathway + priority",
  },
  premium: {
    icon: Crown,
    tone: "from-accent-soft to-success-soft/70",
    bar: "bg-success",
    label: "Premium",
    hook: "Coaching + same-day SLA",
  },
};

/** Drop “Everything in …” lines so cards show the real upgrade diffs. */
function coreDiffs(features: string[]): string[] {
  return features.filter((f) => !/^everything in /i.test(f)).slice(0, 4);
}

/**
 * Comic comparison strip for Standard / Pro / Premium.
 * Prices stay tied to catalog products ($190 / $450 / $890).
 */
export function TierComparison({
  products,
  className,
}: {
  products: Product[];
  className?: string;
}) {
  const ordered = (["standard", "pro", "premium"] as const)
    .map((t) => products.find((p) => p.tier === t))
    .filter((p): p is Product => Boolean(p));

  if (ordered.length < 2) return null;

  return (
    <div className={cn("mb-6", className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="comic-sticker !rotate-[-3deg]">Compare</span>
          <h3 className="mt-2 font-display text-lg font-bold text-fg sm:text-xl">
            Standard · Pro · Premium — what changes
          </h3>
          <p className="mt-0.5 max-w-2xl text-sm font-semibold text-fg-muted">
            Same exam family. Clear upgrades in sandbox, support, and pathway —
            pick the tier that matches your goal.
          </p>
        </div>
      </div>
      <div className="stagger-in grid gap-3 md:grid-cols-3">
        {ordered.map((p) => {
          const tier = (p.tier || "standard") as ProductTier;
          const meta = TIER_META[tier];
          const Icon = meta.icon;
          const diffs = coreDiffs(p.features);
          return (
            <article
              key={p.id}
              className={cn(
                "comic-panel card-hover relative overflow-hidden bg-gradient-to-br p-4",
                meta.tone,
              )}
            >
              <div className={cn("absolute inset-x-0 top-0 h-1.5", meta.bar)} />
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-display text-base font-bold text-fg">
                  <Icon className="h-4 w-4 text-primary" />
                  {meta.label}
                </span>
                {p.badge ? (
                  <span className="rounded-full border-2 border-border-strong bg-accent px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-fg shadow-sm">
                    {p.badge}
                  </span>
                ) : null}
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                {meta.hook}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-fg">
                {formatUsd(p.priceUsd)}
              </p>
              <ul className="mt-3 space-y-1.5">
                {diffs.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm font-semibold text-fg-muted"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
