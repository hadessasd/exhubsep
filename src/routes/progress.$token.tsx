import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/progress/$token")({
  component: ProgressPage,
  head: () => ({
    meta: [
      { title: "Project progress | ExamHub" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type ProgressData = {
  kind: string;
  title: string | null;
  progress: number;
  status: string;
  adminMessage: string | null;
  deliveryUrl: string | null;
  updatedAt?: string;
};

function ProgressPage() {
  const { token } = Route.useParams();
  const { isAdmin } = Route.useRouteContext();
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/progress/${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Not found");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      }
    }
    void load();
    const t = setInterval(() => void load(), 20000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [token]);

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <Badge className="mb-2">Live progress</Badge>
        <h1 className="font-display text-3xl font-bold text-fg">
          {data?.title || "Your project"}
        </h1>
        <p className="mt-1 text-sm capitalize text-fg-muted">
          {data?.kind || "…"} · updates automatically
        </p>

        {error ? (
          <Card className="mt-6 border-red-200">
            <CardContent className="p-5 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : !data ? (
          <div className="mt-10 flex justify-center text-fg-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Progress</span>
                <Badge variant="outline" className="capitalize">
                  {data.status.replace("_", " ")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span className="text-fg-muted">Completion</span>
                  <span className="text-primary">{data.progress}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-bg-soft">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${Math.min(100, data.progress)}%` }}
                  />
                </div>
              </div>

              {data.adminMessage ? (
                <div className="rounded-xl border border-border bg-bg-soft/80 px-3 py-2 text-sm text-fg">
                  {data.adminMessage}
                </div>
              ) : null}

              {data.deliveryUrl && data.progress >= 100 ? (
                <a
                  href={data.deliveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-fg"
                >
                  View delivery
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : data.progress < 100 ? (
                <p className="text-center text-xs text-muted">
                  Delivery link unlocks at 100% when admin attaches it.
                </p>
              ) : (
                <p className="text-center text-xs text-muted">
                  Marked ready — delivery link pending from admin.
                </p>
              )}

              {data.updatedAt ? (
                <p className="text-center text-[10px] text-muted">
                  Updated {new Date(data.updatedAt).toLocaleString()}
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}

        <p className="mt-8 text-center text-xs text-muted">
          <Link to="/" className="text-primary hover:underline">
            ← ExamHub home
          </Link>
        </p>
      </div>
    </Shell>
  );
}
