import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { getBlogPost } from "@/lib/server/examhub";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPost({ data: params.slug });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return {};
    return {
      meta: [
        { title: post.seo_title },
        { name: "description", content: post.seo_description },
        ...(post.seo_keywords
          ? [{ name: "keywords", content: post.seo_keywords }]
          : []),
        { property: "og:title", content: post.seo_title },
        { property: "og:description", content: post.seo_description },
        { property: "og:type", content: "article" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.seo_title,
            description: post.seo_description,
            datePublished: post.published_at,
            author: { "@type": "Organization", name: "ExamHub" },
          }),
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const { isAdmin } = Route.useRouteContext();

  return (
    <Shell isAdmin={isAdmin}>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          to="/blog"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          All posts
        </Link>
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
          {post.title}
        </h1>
        {post.published_at ? (
          <p className="mt-2 text-sm text-muted">
            {new Date(post.published_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        ) : null}
        <div
          className="prose-examhub mt-8 rounded-2xl border border-border bg-surface/90 p-6 shadow-sm sm:p-8"
          dangerouslySetInnerHTML={{ __html: post.html_content }}
        />
      </article>
    </Shell>
  );
}
