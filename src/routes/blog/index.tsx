import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { listBlogPosts } from "@/lib/server/examhub";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  head: () => ({
    meta: [
      {
        title: "ExamHub Blog | SAT ACT Proctoring Guides & Exam Tips",
      },
      {
        name: "description",
        content:
          "SEO-optimized ExamHub guides on SAT, ACT, LockDown Browser, Honorlock, Proctorio, research writing, and internships.",
      },
    ],
  }),
});

type Post = Awaited<ReturnType<typeof listBlogPosts>>[number];

function BlogIndex() {
  const { isAdmin } = Route.useRouteContext();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBlogPosts({ data: {} })
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
          ExamHub Blog
        </h1>
        <p className="mt-2 text-fg-muted">
          Guides and updates for exam prep, proctoring tools, and student
          success.
        </p>

        {loading ? (
          <div className="mt-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-bg-soft" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <FileText className="h-10 w-10 text-muted" />
              <p className="text-fg-muted">
                No posts yet. Admin can publish from the dashboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 space-y-4">
            {posts.map((post) => (
              <Link key={post.id} to="/blog/$slug" params={{ slug: post.slug }}>
                <Card className="card-hover mb-4">
                  <CardContent className="p-5">
                    <Badge variant="outline">Article</Badge>
                    <h2 className="mt-2 font-display text-xl font-semibold text-fg">
                      {post.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
                      {post.seo_description}
                    </p>
                    {post.published_at ? (
                      <p className="mt-3 text-xs text-muted">
                        {new Date(post.published_at).toLocaleDateString()}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
