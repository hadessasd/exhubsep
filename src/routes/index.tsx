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
  getProductsByCategory,
} from "@/lib/data/catalog";
import { ProductCard } from "@/components/products/product-card";
import { formatUsd } from "@/lib/utils";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Wallet,
  Percent,
  Play,
  FileText,
  Briefcase,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      {
        title:
          "ExamHub | SAT ACT Prep, LockDown Browser, USACO, Honorlock, Proctorio",
      },
      {
        name: "description",
        content:
          "ExamHub: 4.4★ from 755 green vouch ratings. SAT/ACT pathways, Universal Proctor Bypass, full proctor stack, USACO, research papers, internships. Crypto + G2A voucher checkout.",
      },
    ],
  }),
});


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
  const universal = PRODUCTS.find((p) => p.id.includes("universal-proctor"));
  const proctors = getProductsByCategory("proctoring").filter(
    (p) => !p.id.includes("universal"),
  );
  const contests = getProductsByCategory("contests");
  const tools = getProductsByCategory("tools");
  
  return (
    <Shell isAdmin={isAdmin}>
      <div className="pb-8 pt-6 sm:pt-10">
        {/* 1. Hero + categories */}
        <HeroSearch />

        <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <a
            href="https://t.me/SATBypass"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm font-semibold text-fg shadow-sm transition hover:border-primary/50"
          >
            <span>Join our Telegram · t.me/SATBypass</span>
            <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-fg">
              Open
            </span>
          </a>
        </div>

        {/* 2. Vouches under categories, above products */}
        <div className="mt-8 sm:mt-10">
          <ScoreVouches />
        </div>

        {/* 3. Trust chips */}
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
                className="border-border/80 bg-surface/90 shadow-sm card-hover"
              >
                <CardContent className="flex gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-fg">{item.title}</p>
                    <p className="text-xs leading-relaxed text-fg-muted">
                      {item.body}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#3d2918] via-[#5c3d22] to-primary p-[1px] shadow-lg">
            <div className="rounded-[1.4rem] bg-gradient-to-br from-[#2c1a0e] via-[#3d2918] to-[#4a3018] p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
              <div className="max-w-xl">
                <Badge className="mb-3 border-0 bg-accent/20 text-accent-soft">
                  <Play className="mr-1 h-3.5 w-3.5" />
                  Interactive demo
                </Badge>
                <h2 className="font-display text-2xl font-bold text-[#fffbf5] sm:text-3xl">
                  SAT assist overlay + sandbox visual
                </h2>
                <p className="mt-2 text-sm text-[#e4d4bb]">
                  Guided tutorial first, then a 5-question digital SAT frame with
                  discreet Assist control and sandbox isolation diagram.
                </p>
              </div>
              <Link to="/demo" className="mt-5 inline-block sm:mt-0">
                <Button
                  size="lg"
                  className="bg-[#fffbf5] text-[#2c1a0e] hover:bg-accent-soft"
                >
                  Open demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>


        {/* Products anchor — category chips scroll here */}
        <div id="section-products" className="scroll-mt-24" />

        <CatalogBlock
          id="section-sat"
          title="SAT pathways"
          subtitle="Standard · Pro · Premium"
          products={sat}
        />

        <CatalogBlock
          id="section-act"
          title="ACT pathways"
          subtitle="Standard · Pro · Premium"
          products={act}
        />

        {universal ? (
          <section
            id="section-universal"
            className="mx-auto mt-14 scroll-mt-24 max-w-6xl rounded-2xl px-4 transition sm:px-6"
          >
            <div className="mb-5 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold text-fg">
                Universal Proctor Bypass
              </h2>
            </div>
            <ProductCard product={universal} />
          </section>
        ) : null}

        {bundle ? (
          <section
            id="section-bundle"
            className="mx-auto mt-14 scroll-mt-24 max-w-6xl rounded-2xl px-4 transition sm:px-6"
          >
            <h2 className="mb-5 font-display text-2xl font-bold text-fg">
              Pro bundle
            </h2>
            <ProductCard product={bundle} />
          </section>
        ) : null}

        <CatalogBlock
          id="section-proctoring"
          title="Proctor tools"
          subtitle="LockDown, Honorlock, Proctorio & more"
          products={proctors}
          moreHref="/category/proctoring"
        />
        <CatalogBlock
          id="section-contests"
          title="Contests"
          subtitle="USACO and major olympiads"
          products={contests}
          moreHref="/category/contests"
        />
        <CatalogBlock
          id="section-tools"
          title="Tools"
          subtitle="Useful extras for study & delivery"
          products={tools}
          moreHref="/category/tools"
        />

        <section
          id="section-research"
          className="mx-auto mt-14 grid max-w-6xl scroll-mt-24 gap-4 rounded-2xl px-4 transition sm:grid-cols-2 sm:px-6"
        >
          <Link to="/research" className="group">
            <Card className="h-full border-border/80 bg-surface/95 card-hover">
              <CardContent className="flex gap-4 p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <FileText className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-fg group-hover:text-primary">
                    Research papers
                  </h3>
                  <p className="mt-1 text-sm text-fg-muted">
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
                <CardContent className="flex gap-4 p-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Briefcase className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-fg group-hover:text-primary">
                      Internships
                    </h3>
                    <p className="mt-1 text-sm text-fg-muted">
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
      </div>
    </Shell>
  );
}

function CatalogBlock({
  id,
  title,
  subtitle,
  products,
  moreHref,
}: {
  id?: string;
  title: string;
  subtitle: string;
  products: (typeof PRODUCTS)[number][];
  moreHref?: string;
}) {
  if (!products.length) return null;
  return (
    <section
      id={id}
      className="mx-auto mt-14 scroll-mt-24 max-w-6xl rounded-2xl px-4 transition sm:px-6"
    >
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-fg">{title}</h2>
          <p className="text-sm text-fg-muted">{subtitle}</p>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
