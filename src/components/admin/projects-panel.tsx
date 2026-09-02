import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";

type Project = {
  id: string;
  publicToken: string;
  kind: string;
  contactMethod: string | null;
  contactValue: string | null;
  progress: number;
  deliveryUrl: string | null;
  status: string;
  title: string | null;
  notes: string | null;
  adminMessage: string | null;
  createdAt?: string;
};

export function ProjectsPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<
    Record<
      string,
      {
        progress: number;
        deliveryUrl: string;
        adminMessage: string;
        status: string;
      }
    >
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/projects", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setProjects(data);
      const map: typeof edits = {};
      for (const p of data as Project[]) {
        map[p.id] = {
          progress: p.progress,
          deliveryUrl: p.deliveryUrl || "",
          adminMessage: p.adminMessage || "",
          status: p.status,
        };
      }
      setEdits(map);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(id: string) {
    const e = edits[id];
    if (!e) return;
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          progress: e.progress,
          deliveryUrl: e.deliveryUrl || null,
          adminMessage: e.adminMessage || null,
          status: e.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      toast.success("Project updated");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  function progressUrl(token: string) {
    if (typeof window === "undefined") return `/progress/${token}`;
    return `${window.location.origin}/progress/${token}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-fg">
            Research & internship progress
          </h2>
          <p className="text-sm text-fg-muted">
            Update the progress bar, attach delivery when 100%, message the
            buyer.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted">
            No projects yet. They appear when a buyer pays and submits contact on
            /activate.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => {
            const e = edits[p.id] || {
              progress: p.progress,
              deliveryUrl: p.deliveryUrl || "",
              adminMessage: p.adminMessage || "",
              status: p.status,
            };
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <span>{p.title || p.kind}</span>
                    <Badge variant="outline" className="capitalize">
                      {p.kind}
                    </Badge>
                    <Badge className="capitalize">{p.status}</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted">
                    {p.contactMethod}: {p.contactValue}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Progress %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={e.progress}
                      onChange={(ev) =>
                        setEdits((prev) => ({
                          ...prev,
                          [p.id]: {
                            ...e,
                            progress: Number(ev.target.value) || 0,
                          },
                        }))
                      }
                    />
                    <div className="h-2 overflow-hidden rounded-full bg-bg-soft">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, e.progress)}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <select
                      className="flex h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                      value={e.status}
                      onChange={(ev) =>
                        setEdits((prev) => ({
                          ...prev,
                          [p.id]: { ...e, status: ev.target.value },
                        }))
                      }
                    >
                      <option value="in_progress">in_progress</option>
                      <option value="ready">ready</option>
                      <option value="delivered">delivered</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Delivery URL (shown at 100%)</Label>
                    <Input
                      value={e.deliveryUrl}
                      onChange={(ev) =>
                        setEdits((prev) => ({
                          ...prev,
                          [p.id]: { ...e, deliveryUrl: ev.target.value },
                        }))
                      }
                      placeholder="https://…"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Message to buyer</Label>
                    <Textarea
                      value={e.adminMessage}
                      onChange={(ev) =>
                        setEdits((prev) => ({
                          ...prev,
                          [p.id]: { ...e, adminMessage: ev.target.value },
                        }))
                      }
                      className="min-h-[60px]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <Button size="sm" onClick={() => void save(p.id)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          progressUrl(p.publicToken),
                        );
                        toast.success("Progress link copied");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy buyer link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
