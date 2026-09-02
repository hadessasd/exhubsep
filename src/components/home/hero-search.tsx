import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  GraduationCap,
  BookOpen,
  Shield,
  Package,
  FileText,
  Briefcase,
  Sparkles,
  Trophy,
  Wrench,
  Play,
} from "lucide-react";
import {
  CATEGORIES,
  searchProducts,
  type ProductCategory,
} from "@/lib/data/catalog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  all: Sparkles,
  sat: GraduationCap,
  act: BookOpen,
  proctoring: Shield,
  contests: Trophy,
  tools: Wrench,
  bundle: Package,
  research: FileText,
  internship: Briefcase,
};

/** Scroll target on the homepage for each category chip */
const SECTION_BY_CAT: Record<string, string> = {
  all: "section-products",
  sat: "section-sat",
  act: "section-act",
  proctoring: "section-proctoring",
  contests: "section-contests",
  tools: "section-tools",
  bundle: "section-bundle",
  research: "section-research",
  internship: "section-internships",
};

const CORE_CATS = CATEGORIES.filter(
  (c) => c.id !== "research" && c.id !== "internship",
);
const SERVICE_CATS = CATEGORIES.filter(
  (c) => c.id === "research" || c.id === "internship",
);

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // Brief highlight so the target stands out
  el.classList.add("ring-2", "ring-primary/40", "ring-offset-2", "ring-offset-bg");
  window.setTimeout(() => {
    el.classList.remove(
      "ring-2",
      "ring-primary/40",
      "ring-offset-2",
      "ring-offset-bg",
    );
  }, 1400);
}

export function HeroSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");

  const results = useMemo(() => {
    let list = searchProducts(query);
    if (
      category !== "all" &&
      category !== "research" &&
      category !== "internship"
    ) {
      list = list.filter((p) => p.category === category);
    }
    return list;
  }, [query, category]);

  function selectCategory(id: ProductCategory | "all") {
    setCategory(id);
    const target = SECTION_BY_CAT[id] ?? "section-products";
    // Defer so layout paints before scroll (vouch sits between chips & products)
    window.requestAnimationFrame(() => {
      window.setTimeout(() => scrollToSection(target), 40);
    });
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (results[0]) {
      // Jump to products area; filtered list is shown there via hash state
      scrollToSection("section-products");
    }
  }

  return (
    <section id="catalog" className="scroll-mt-24">
      <div className="stagger-in mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface/90 p-6 shadow-glow sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-soft blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-accent-soft blur-3xl" />

          <div className="relative">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge>US · UK · Europe · Global</Badge>
              <Link to="/demo">
                <Badge variant="accent" className="cursor-pointer gap-1">
                  <Play className="h-3 w-3" />
                  Live demo
                </Badge>
              </Link>
            </div>
            <h1 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-fg sm:text-5xl">
              Exam prep that actually{" "}
              <span className="text-primary">feels premium</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-fg-muted sm:text-lg">
              SAT & ACT pathways, Universal Proctor Bypass, full lockdown stack,
              USACO & contests, plus research papers and internship matching.
            </p>

            <form
              className="relative mt-8 max-w-xl"
              onSubmit={onSearchSubmit}
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search SAT, LockDown, Universal Bypass, USACO…"
                className="h-12 pl-11 text-base shadow-md"
                aria-label="Search products"
              />
            </form>

            {query.trim() && results.length > 0 ? (
              <p className="mt-2 text-xs text-fg-muted">
                {results.length} match{results.length === 1 ? "" : "es"} — pick a
                category below or scroll to products
              </p>
            ) : null}

            {/* Main product categories — scroll to section on select */}
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {CORE_CATS.map((cat) => {
                  const Icon = CAT_ICONS[cat.id] ?? Sparkles;
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selectCategory(cat.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-fg shadow-md"
                          : "border-border bg-surface text-fg-muted hover:border-primary/40 hover:text-primary",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Services — navigate or scroll */}
            <div className="mt-5 border-t border-border/70 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Services
              </p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATS.map((cat) => {
                  const Icon = CAT_ICONS[cat.id] ?? Sparkles;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategory(cat.id);
                        scrollToSection(SECTION_BY_CAT[cat.id]!);
                      }}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                        "border-border bg-bg-soft text-fg hover:border-primary/40 hover:bg-primary-soft hover:text-primary",
                      )}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/demo">
                <Button variant="outline" size="sm">
                  <Play className="h-4 w-4" />
                  Open assist + sandbox demo
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => scrollToSection("section-products")}
              >
                Browse all products
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
