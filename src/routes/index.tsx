import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { HeroSearch } from "@/components/home/hero-search";
import { ScoreVouches } from "@/components/home/score-vouches";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PRODUCTS,
  SUPPORT_TELEGRAM,
  SUPPORT_TELEGRAM_URL,
  getProductsByCategory,
} from "@/lib/data/catalog";
import { ProductCard } from "@/components/products/product-card";
import { CategoryShowcaseVideo } from "@/components/home/category-showcase-video";
import { Reveal } from "@/components/home/reveal";
import { TierComparison } from "@/components/home/tier-comparison";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Wallet,
  Percent,
  FileText,
  Briefcase,
  Shield,
  GraduationCap,
  BookOpen,
  Send,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      {
        title:
          "ExamHub | SAT ACT GRE GMAT Prep, LockDown Browser, Honorlock, Proctorio",
      },
      {
        name: "description",
        content:
          "ExamHub: SAT, ACT, GRE & GMAT pathways, Universal Proctor Bypass for LockDown Browser and 30+ tools. Crypto + G2A voucher checkout. Telegram @" +
          SUPPORT_TELEGRAM +
          ".",
      },
    ],
  }),
});

const SECTION_NAV = [
  { id: "section-sat", label: "SAT" },
  { id: "section-act", label: "ACT" },
  { id: "section-gre", label: "GRE" },
  { id: "section-gmat", label: "GMAT" },
  { id: "section-proctoring", label: "Proctor" },
] as const;

function HomePage() {
  useEffect(() => {
    try {
      sessionStorage.removeItem("examhub.just-signed-in");
      sessionStorage.removeItem("examhub.auth-navigating");
    } catch {
      /* ignore */
    }
  }, []);

  const { isAdmin } = Route.useRouteContext();
  const bundle = PRODUCTS.find((p) => p.category === "bundle");
  const sat = getProductsByCategory("sat");
  const act = getProductsByCategory("act");
  const gmat = getProductsByCategory("gmat");
  const gre = getProductsByCategory("gre");
  const universal = PRODUCTS.find((p) => p.id.includes("universal-proctor"));
  const proctors = getProductsByCategory("proctoring").filter(
    (p) => !p.id.includes("universal"),
  );
  const contests = getProductsByCategory("contests");
  const tools = getProductsByCategory("tools");

  return (
    <Shell isAdmin={isAdmin}>
      <div className="pb-12 pt-6 sm:pt-10">
        <HeroSearch />

        {/* Prominent Telegram */}
        <Reveal className="mx-auto mt-7 max-w-6xl px-4 sm:px-6">
          <a
            href={SUPPORT_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col overflow-hidden rounded-3xl border-[2.5px] border-border-strong bg-gradient-to-r from-[#1d9bd5] via-[#2AABEE] to-[#6ec8f5] p-[1px] shadow-lg transition hover:shadow-xl sm:flex-row"
          >
            <div className="flex flex-1 flex-col gap-3 rounded-[1.4rem] bg-[#0e7fb8]/95 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                  <Send className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">
                    Community · Support · Updates
                  </p>
                  <p className="mt-1 font-display text-xl font-bold sm:text-2xl">
                    Telegram · @{SUPPORT_TELEGRAM}
                  </p>
                  <p className="mt-1 max-w-xl text-sm text-white/85">
                    Join for delivery help, score pathways, and proctor tips —
                    same handle linked in the header and footer.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#0e7fb8] shadow-sm transition group-hover:scale-[1.02] sm:self-center">
                Open Telegram
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </a>
        </Reveal>

        {/* Jump nav for neat exam sections */}
        <nav
          aria-label="Exam sections"
          className="mx-auto mt-6 max-w-6xl px-4 sm:px-6"
        >
          <div className="comic-panel flex flex-wrap items-center gap-2 bg-surface/95 p-2">
            <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted">
              Jump to
            </span>
            {SECTION_NAV.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-xl px-3 py-1.5 text-sm font-semibold text-fg transition hover:bg-primary-soft hover:text-primary"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-8 sm:mt-10">
          <ScoreVouches />
        </div>

        <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ShieldCheck,
                title: "Secure checkout",
                body: "Gift cards + BTC, SOL, ETH, BitPay & more",
              },
              {
                icon: Zap,
                title: "Universal proctor",
                body: "One stack for LockDown, Honorlock, Proctorio & 30+",
              },
              {
                icon: Percent,
                title: "Live crypto checkout",
                body: "SOL · USDC · ETH · LTC with QR + G2A voucher option",
              },
              {
                icon: Wallet,
                title: "Crypto friendly",
                body: "On-chain wallets or hosted rails — paste TX / invoice",
              },
            ].map((item) => (
              <Card
                key={item.title}
                className="comic-panel card-hover bg-surface/95"
              >
                <CardContent className="flex gap-3 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-fg">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                      {item.body}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div id="section-products" className="scroll-mt-24" />

        <CatalogBlock
          id="section-sat"
          eyebrow="Exam pathway"
          title="SAT"
          subtitle="Standard · Pro · Premium — macOS & Windows software delivery"
          icon={GraduationCap}
          products={sat}
          showcaseCategory="sat"
        />

        <CatalogBlock
          id="section-act"
          eyebrow="Exam pathway"
          title="ACT"
          subtitle="Standard · Pro · Premium — distinct ACT builds per OS"
          icon={BookOpen}
          products={act}
          showcaseCategory="act"
        />

        <CatalogBlock
          id="section-gre"
          eyebrow="Exam pathway"
          title="GRE"
          subtitle="Standard · Pro · Premium — Payment Links via admin when ready"
          icon={BookOpen}
          products={gre}
          showcaseCategory="gre"
        />

        <CatalogBlock
          id="section-gmat"
          eyebrow="Exam pathway"
          title="GMAT"
          subtitle="Standard · Pro · Premium — Payment Links via admin when ready"
          icon={GraduationCap}
          products={gmat}
          showcaseCategory="gmat"
        />

        {/* Proctor lockdown browsers — universal delivery */}
        <section
          id="section-proctoring"
          className="mx-auto mt-16 scroll-mt-24 max-w-6xl px-4 sm:px-6"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border/80 pb-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  Lockdown browsers
                </p>
                <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">
                  Proctor tools
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-fg-muted">
                  LockDown Browser, Honorlock, Proctorio & 30+ platforms — one
                  shared <strong>universal</strong> software delivery pack (not
                  siloed per exam).
                </p>
              </div>
            </div>
            <a
              href="/category/proctoring"
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all proctor tools
            </a>
          </div>

          <div className="comic-panel category-box overflow-hidden bg-surface p-3 sm:p-4">
            <div className="grid gap-4 lg:has-[data-showcase]:grid-cols-[minmax(220px,38%)_minmax(0,1fr)] lg:has-[data-showcase]:items-start">
              <CategoryShowcaseVideo category="proctor" />
              <div className="min-w-0 space-y-4">
                {universal ? (
                  <div id="section-universal" className="scroll-mt-24">
                    <ProductCard product={universal} featured />
                  </div>
                ) : null}
                <div className="stagger-in grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {proctors.slice(0, 6).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {proctors.length > 6 ? (
                  <div className="text-center">
                    <a href="/category/proctoring">
                      <Button variant="outline" className="btn-comic">
                        See all {proctors.length} proctor tools
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {bundle ? (
          <section
            id="section-bundle"
            className="mx-auto mt-16 scroll-mt-24 max-w-6xl px-4 sm:px-6"
          >
            <SectionHeading
              eyebrow="Value pack"
              title="Pro bundle"
              subtitle="SAT + ACT + lockdown stack in one checkout"
            />
            <ProductCard product={bundle} featured />
          </section>
        ) : null}

        <CatalogBlock
          id="section-contests"
          eyebrow="Olympiads"
          title="Contests"
          subtitle="USACO and major olympiads"
          products={contests}
          moreHref="/category/contests"
        />
        <CatalogBlock
          id="section-tools"
          eyebrow="Extras"
          title="Tools"
          subtitle="Useful extras for study & delivery"
          products={tools}
          moreHref="/category/tools"
        />

        <section
          id="section-research"
          className="mx-auto mt-16 grid max-w-6xl scroll-mt-24 gap-4 px-4 sm:grid-cols-2 sm:px-6"
        >
          <Link to="/research" className="group">
            <Card className="h-full border-border/80 bg-surface/95 card-hover">
              <CardContent className="flex gap-4 p-6 sm:p-7">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <FileText className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-fg group-hover:text-primary">
                    Research papers
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                    Flat $800 package · free Q1/Q2 & add-ons · Stripe checkout
                  </p>
                  <span className="mt-3 inline-flex text-sm font-semibold text-primary">
                    Open research quote →
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
          <div id="section-internships" className="scroll-mt-24">
            <Link to="/internships" className="group">
              <Card className="h-full border-border/80 bg-surface/95 card-hover">
                <CardContent className="flex gap-4 p-6 sm:p-7">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Briefcase className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-fg group-hover:text-primary">
                      Internships
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                      Field + state search · weekly salary estimate · max $1,200
                      base
                    </p>
                    <span className="mt-3 inline-flex text-sm font-semibold text-primary">
                      Open internship form →
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Closing telegram CTA */}
        <div className="mx-auto mt-16 max-w-6xl px-4 text-center sm:px-6">
          <p className="text-sm text-fg-muted">
            Questions before checkout? Message us on Telegram{" "}
            <a
              href={SUPPORT_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              @{SUPPORT_TELEGRAM}
            </a>
            .
          </p>
        </div>
      </div>
    </Shell>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  moreHref,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  icon?: React.ComponentType<{ className?: string }>;
  moreHref?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border/80 pb-4">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
        </div>
      </div>
      {moreHref ? (
        <a
          href={moreHref}
          className="text-sm font-semibold text-primary hover:underline"
        >
          View all
        </a>
      ) : null}
    </div>
  );
}

function CatalogBlock({
  id,
  eyebrow,
  title,
  subtitle,
  products,
  moreHref,
  icon,
  showcaseCategory,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  products: (typeof PRODUCTS)[number][];
  moreHref?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Homepage showcase video category key (sat|act|gre|gmat|proctor) */
  showcaseCategory?: string;
}) {
  if (!products.length) return null;
  const hasTiers = products.some((p) => p.tier === "standard" || p.tier === "pro" || p.tier === "premium");
  return (
    <Reveal>
      <section
        id={id}
        className="mx-auto mt-16 scroll-mt-24 max-w-6xl px-4 sm:px-6"
      >
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          icon={icon}
          moreHref={moreHref}
        />
        {/* One category box: video + packages side-by-side (stacked on mobile) */}
        <div className="comic-panel category-box overflow-hidden bg-surface p-3 sm:p-4">
          <div className="grid gap-4 lg:has-[data-showcase]:grid-cols-[minmax(220px,38%)_minmax(0,1fr)] lg:has-[data-showcase]:items-start">
            {showcaseCategory ? (
              <CategoryShowcaseVideo category={showcaseCategory} />
            ) : null}
            <div className="min-w-0 space-y-4">
              {hasTiers ? (
                <TierComparison products={products} className="!mb-0" />
              ) : null}
              <div className="stagger-in grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
