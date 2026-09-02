import { createFileRoute, notFound } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { ProductCard } from "@/components/products/product-card";
import {
  CATEGORIES,
  getProductsByCategory,
  type ProductCategory,
} from "@/lib/data/catalog";

const VALID: ProductCategory[] = [
  "sat",
  "act",
  "proctoring",
  "bundle",
  "contests",
  "tools",
];

export const Route = createFileRoute("/category/$cat")({
  loader: ({ params }) => {
    if (!VALID.includes(params.cat as ProductCategory)) throw notFound();
    const cat = params.cat as ProductCategory;
    const meta = CATEGORIES.find((c) => c.id === cat);
    const products = getProductsByCategory(cat);
    return { cat, meta, products };
  },
  head: ({ loaderData }) => {
    const label = loaderData?.meta?.label ?? "Category";
    const products = loaderData?.products ?? [];
    return {
      meta: [
        {
          title: `${label} Exam Tools & Prep | ExamHub Marketplace`,
        },
        {
          name: "description",
          content: `Browse ${products.length} ${label} listings on ExamHub. Compare tiers, regions, and pricing. Crypto gift card checkout available.`,
        },
        {
          name: "keywords",
          content: `${label}, ExamHub, exam prep, proctoring, LockDown Browser, USACO, contests, online exam support`,
        },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { meta, products, cat } = Route.useLoaderData();
  const { isAdmin } = Route.useRouteContext();

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Category
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-fg sm:text-4xl">
          {meta?.label ?? cat}
        </h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          {meta?.description ?? "Browse ExamHub listings in this category."}
        </p>
        <p className="mt-1 text-sm text-muted">
          {products.length} listing{products.length === 1 ? "" : "s"}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </Shell>
  );
}
