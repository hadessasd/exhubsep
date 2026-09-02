import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, ArrowLeft } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Badge } from "@/components/ui/badge";
import { getProductBySlug, PRODUCTS } from "@/lib/data/catalog";
import { formatUsd } from "@/lib/utils";

export const Route = createFileRoute("/products/$slug")({
  loader: ({ params }) => {
    const product = getProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return {};
    return {
      meta: [
        { title: p.seoTitle },
        { name: "description", content: p.seoDescription },
        { name: "keywords", content: p.seoKeywords.join(", ") },
        { property: "og:title", content: p.seoTitle },
        { property: "og:description", content: p.seoDescription },
        { property: "og:type", content: "product" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.seoDescription,
            offers: {
              "@type": "Offer",
              price: p.priceUsd,
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
            },
            brand: { "@type": "Brand", name: "ExamHub" },
          }),
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { isAdmin } = Route.useRouteContext();
  const related = PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id,
  ).slice(0, 3);

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/"
          hash="catalog"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Link>

        <div className="grid min-w-0 gap-8 lg:grid-cols-5">
          <div className="min-w-0 space-y-6 lg:col-span-3">
            <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-md sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>
                  {product.category === "proctoring"
                    ? "Proctor tool"
                    : product.category.toUpperCase()}
                </Badge>
                {product.badge ? (
                  <Badge variant="accent">{product.badge}</Badge>
                ) : null}
                {product.tier ? (
                  <Badge variant="outline">{product.tier}</Badge>
                ) : null}
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold text-fg sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-2 font-display text-3xl font-bold text-primary">
                {formatUsd(product.priceUsd)}
              </p>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">
                {product.longDescription}
              </p>

              <h2 className="mt-8 font-display text-lg font-semibold text-fg">
                What’s included
              </h2>
              <ul className="mt-3 space-y-2">
                {product.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-fg-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>

              {product.regions?.length ? (
                <>
                  <h2 className="mt-8 font-display text-lg font-semibold text-fg">
                    Regions covered
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.regions.map((r) => (
                      <Badge key={r} variant="outline">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            {related.length > 0 ? (
              <div>
                <h2 className="mb-3 font-display text-lg font-semibold text-fg">
                  Related
                </h2>
                <div className="flex flex-wrap gap-2">
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      to="/products/$slug"
                      params={{ slug: r.slug }}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg-muted hover:border-primary/40 hover:text-primary"
                    >
                      {r.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 lg:col-span-2">
            <div className="min-w-0 lg:sticky lg:top-24">
              <CheckoutForm product={product} />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
