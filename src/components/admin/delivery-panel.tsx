import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Trash2 } from "lucide-react";

type Asset = {
  id: string;
  scopeKey: string;
  label: string;
  category: string | null;
  tier: string | null;
  os: string | null;
  fileUrl: string | null;
  message: string | null;
  steps: string | null;
};

type Preset = { scopeKey: string; label: string };

export function DeliveryPanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeKey, setScopeKey] = useState("sat-all-macos");
  const [label, setLabel] = useState("All SAT · macOS");
  const [fileUrl, setFileUrl] = useState("");
  const [message, setMessage] = useState("");
  const [steps, setSteps] = useState("");
  const [os, setOs] = useState("macos");
  const [tier, setTier] = useState("all");
  const [category, setCategory] = useState("sat");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/delivery", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setAssets(data.assets || []);
      setPresets(data.presets || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scopeKey,
          label,
          category,
          tier,
          os,
          fileUrl: fileUrl || null,
          message: message || null,
          steps: steps || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      toast.success("Delivery asset saved");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this delivery asset?")) return;
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deleteId: id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Deleted");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  function applyPreset(p: Preset) {
    setScopeKey(p.scopeKey);
    setLabel(p.label);
    const parts = p.scopeKey.split("-");
    if (parts[0] === "proctor") {
      setCategory("proctor");
      setOs("all");
      setTier("all");
    } else {
      setCategory(parts[0] || "sat");
      setTier(parts[1] || "all");
      setOs(parts[2] || "macos");
    }
    // Load existing asset into form if present
    const existing = assets.find(
      (a) => a.scopeKey.toLowerCase() === p.scopeKey.toLowerCase(),
    );
    if (existing) {
      setFileUrl(existing.fileUrl || "");
      setMessage(existing.message || "");
      setSteps(existing.steps || "");
    } else {
      setFileUrl("");
      setMessage("");
      setSteps("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-fg">
            Bypass & proctor delivery
          </h2>
          <p className="text-sm text-fg-muted">
            One file for all SAT on macOS, or per tier / OS. Proctor tools use
            universal steps or per-listing scope. Shown on /activate after
            whitelist.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Save delivery asset</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Quick presets</Label>
              <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-border bg-bg-soft/40 p-2">
                {presets.map((p) => (
                  <button
                    key={p.scopeKey}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                      scopeKey === p.scopeKey
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Scope key</Label>
              <Input
                required
                value={scopeKey}
                onChange={(e) => setScopeKey(e.target.value)}
                className="font-mono text-xs"
                placeholder="sat-all-macos"
              />
              <p className="text-[10px] text-muted">
                Pattern: exam-tier-os · e.g. sat-premium-windows, act-all-macos,
                proctor-universal
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="sat | act | proctor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Input
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                placeholder="standard | pro | premium | all"
              />
            </div>
            <div className="space-y-1.5">
              <Label>OS</Label>
              <Input
                value={os}
                onChange={(e) => setOs(e.target.value)}
                placeholder="macos | windows | all"
              />
            </div>
            <div className="space-y-1.5">
              <Label>File / download URL</Label>
              <Input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Short message</Label>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Shown after whitelist"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Steps (proctor / runbook)</Label>
              <Textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                className="min-h-[100px] font-mono text-xs"
                placeholder={"1. Download…\n2. Run…\n3. …"}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Save delivery</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-fg">Saved assets</h3>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted">
            None yet. Use presets above — e.g. “All SAT · macOS” with one file
            for every SAT purchase on Mac.
          </p>
        ) : (
          assets.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-fg">{a.label}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {a.scopeKey}
                    </Badge>
                  </div>
                  {a.fileUrl ? (
                    <a
                      href={a.fileUrl}
                      className="block truncate text-xs text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.fileUrl}
                    </a>
                  ) : null}
                  {a.message ? (
                    <p className="text-xs text-fg-muted">{a.message}</p>
                  ) : null}
                  {a.steps ? (
                    <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap rounded bg-bg-soft p-2 text-[10px]">
                      {a.steps}
                    </pre>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      applyPreset({ scopeKey: a.scopeKey, label: a.label })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={() => void remove(a.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
