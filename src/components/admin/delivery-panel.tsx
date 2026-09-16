import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link2, RefreshCw, Trash2, Upload } from "lucide-react";

type Asset = {
  id: string;
  scopeKey: string;
  label: string;
  category: string | null;
  tier: string | null;
  os: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  message: string | null;
  steps: string | null;
  instructions: string | null;
  fileName: string | null;
  hasFileBlob?: boolean;
  downloadPath?: string | null;
};

type Preset = { scopeKey: string; label: string };

type PayLink = {
  productKey: string;
  label: string | null;
  examFamily: string | null;
  tier: string | null;
  paymentLinkUrl: string;
  resolvedUrl: string;
  source: "admin" | "catalog" | "empty";
  notes: string | null;
};

export function DeliveryPanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [links, setLinks] = useState<PayLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeKey, setScopeKey] = useState("sat-all-macos");
  const [label, setLabel] = useState("All SAT · macOS");
  const [fileUrl, setFileUrl] = useState("");
  const [message, setMessage] = useState("");
  const [steps, setSteps] = useState("");
  const [instructions, setInstructions] = useState("");
  const [os, setOs] = useState("macos");
  const [tier, setTier] = useState("all");
  const [category, setCategory] = useState("sat");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [clearFileBlob, setClearFileBlob] = useState(false);
  const [hasExistingBlob, setHasExistingBlob] = useState(false);
  const [savingLinkKey, setSavingLinkKey] = useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [delRes, linkRes] = await Promise.all([
        fetch("/api/admin/delivery", { credentials: "include" }),
        fetch("/api/admin/payment-links", { credentials: "include" }),
      ]);
      const delData = await delRes.json();
      if (!delRes.ok) throw new Error(delData?.error || "Failed");
      setAssets(delData.assets || []);
      setPresets(delData.presets || []);

      if (linkRes.ok) {
        const linkData = await linkRes.json();
        const list = (linkData.links || []) as PayLink[];
        setLinks(list);
        const drafts: Record<string, string> = {};
        for (const l of list) {
          drafts[l.productKey] =
            l.source === "admin" ? l.paymentLinkUrl : l.paymentLinkUrl || "";
        }
        setLinkDrafts(drafts);
      }
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
          externalUrl: fileUrl || null,
          message: message || null,
          steps: steps || null,
          instructions: instructions || null,
          fileName: fileData ? fileName : undefined,
          fileMime: fileData ? fileMime : undefined,
          fileData: fileData || undefined,
          clearFileBlob: clearFileBlob || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      toast.success("Delivery asset saved");
      setFileData(null);
      setClearFileBlob(false);
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
    const existing = assets.find(
      (a) => a.scopeKey.toLowerCase() === p.scopeKey.toLowerCase(),
    );
    if (existing) {
      setFileUrl(existing.externalUrl || existing.fileUrl || "");
      setMessage(existing.message || "");
      setSteps(existing.steps || "");
      setInstructions(existing.instructions || "");
      setFileName(existing.fileName);
      setHasExistingBlob(Boolean(existing.hasFileBlob));
    } else {
      setFileUrl("");
      setMessage("");
      setSteps("");
      setInstructions("");
      setFileName(null);
      setHasExistingBlob(false);
    }
    setFileData(null);
    setClearFileBlob(false);
  }

  async function onFilePick(file: File | null) {
    if (!file) return;
    if (file.size > 40 * 1024 * 1024) {
      toast.error("Max upload ~40MB — use an external link for larger builds");
      return;
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);
    setFileData(b64);
    setFileName(file.name);
    setFileMime(file.type || "application/octet-stream");
    setClearFileBlob(false);
    setHasExistingBlob(false);
    toast.success(`Ready to upload: ${file.name}`);
  }

  async function saveLink(productKey: string) {
    setSavingLinkKey(productKey);
    try {
      const row = links.find((l) => l.productKey === productKey);
      const res = await fetch("/api/admin/payment-links", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productKey,
          label: row?.label,
          examFamily: row?.examFamily,
          tier: row?.tier,
          paymentLinkUrl: (linkDrafts[productKey] ?? "").trim(),
          notes: row?.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      toast.success(`Saved Payment Link for ${productKey}`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingLinkKey(null);
    }
  }

  const gmatGreLinks = links.filter(
    (l) => l.examFamily === "gmat" || l.examFamily === "gre",
  );
  const otherLinks = links.filter(
    (l) => l.examFamily !== "gmat" && l.examFamily !== "gre",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-fg">
            Delivery & Payment Links
          </h2>
          <p className="text-sm text-fg-muted">
            Per product/tier: upload an app file and/or set an external download
            link, plus buyer instructions. Configure GMAT/GRE Stripe Payment
            Links below (leave empty until you have live buy.stripe.com URLs).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" />
            Stripe Payment Links (GMAT / GRE)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-fg-muted">
            SAT/ACT Standard · Pro · Premium already use the live Payment Links
            in code. Paste GMAT/GRE links here when ready — empty placeholders
            are intentional (no fake Stripe URLs).
          </p>
          {gmatGreLinks.length === 0 && !loading ? (
            <p className="text-sm text-muted">No GMAT/GRE rows yet — refresh after migrate.</p>
          ) : null}
          {gmatGreLinks.map((l) => (
            <div
              key={l.productKey}
              className="grid gap-2 rounded-xl border border-border bg-bg-soft/40 p-3 sm:grid-cols-[140px_1fr_auto]"
            >
              <div>
                <p className="text-sm font-semibold text-fg">
                  {l.label || l.productKey}
                </p>
                <Badge variant="outline" className="mt-1 font-mono text-[10px]">
                  {l.productKey}
                </Badge>
                <p className="mt-1 text-[10px] text-muted">
                  {l.source === "empty"
                    ? "Not configured"
                    : l.source === "admin"
                      ? "Admin override"
                      : "Catalog default"}
                </p>
              </div>
              <Input
                value={linkDrafts[l.productKey] ?? ""}
                onChange={(e) =>
                  setLinkDrafts((prev) => ({
                    ...prev,
                    [l.productKey]: e.target.value,
                  }))
                }
                placeholder="https://buy.stripe.com/… (empty until ready)"
                className="font-mono text-xs"
              />
              <Button
                type="button"
                size="sm"
                disabled={savingLinkKey === l.productKey}
                onClick={() => void saveLink(l.productKey)}
              >
                {savingLinkKey === l.productKey ? "Saving…" : "Save"}
              </Button>
            </div>
          ))}

          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-semibold text-fg">
              SAT / ACT / other Payment Links (optional overrides)
            </summary>
            <div className="mt-3 space-y-2">
              {otherLinks.map((l) => (
                <div
                  key={l.productKey}
                  className="grid gap-2 sm:grid-cols-[140px_1fr_auto]"
                >
                  <div className="text-xs font-medium text-fg-muted">
                    {l.productKey}
                    <div className="text-[10px] text-muted">
                      resolved: {l.resolvedUrl ? "yes" : "empty"} ({l.source})
                    </div>
                  </div>
                  <Input
                    value={linkDrafts[l.productKey] ?? ""}
                    onChange={(e) =>
                      setLinkDrafts((prev) => ({
                        ...prev,
                        [l.productKey]: e.target.value,
                      }))
                    }
                    placeholder="Override buy.stripe.com URL (optional)"
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingLinkKey === l.productKey}
                    onClick={() => void saveLink(l.productKey)}
                  >
                    Save
                  </Button>
                </div>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>

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
                Pattern: exam-tier-os · e.g. gmat-pro-windows, gre-premium-macos
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
                placeholder="sat | act | gmat | gre | proctor"
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
              <Label>External download link</Label>
              <Input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://… (Drive, Dropbox, CDN)"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="flex items-center gap-2">
                <Upload className="h-3.5 w-3.5" />
                Upload app file (optional — stored server-side)
              </Label>
              <Input
                type="file"
                onChange={(e) => void onFilePick(e.target.files?.[0] ?? null)}
              />
              <p className="text-[10px] text-muted">
                {fileData
                  ? `New upload ready: ${fileName}`
                  : hasExistingBlob
                    ? `Existing upload on file${fileName ? `: ${fileName}` : ""}`
                    : "No file uploaded — external link alone is fine."}
              </p>
              {hasExistingBlob || fileData ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:underline"
                  onClick={() => {
                    setFileData(null);
                    setFileName(null);
                    setFileMime(null);
                    setClearFileBlob(true);
                    setHasExistingBlob(false);
                  }}
                >
                  Clear uploaded file
                </button>
              ) : null}
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
              <Label>Buyer instructions / notes</Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[80px] text-sm"
                placeholder="Install notes, license steps, support contact…"
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
            None yet. Use presets — e.g. “All SAT · macOS” with one file for
            every SAT purchase on Mac.
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
                    {a.hasFileBlob ? (
                      <Badge className="bg-green-100 text-green-800">
                        Uploaded file
                      </Badge>
                    ) : null}
                  </div>
                  {a.fileUrl ? (
                    <a
                      href={a.downloadPath || a.fileUrl}
                      className="block truncate text-xs text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.downloadPath || a.fileUrl}
                    </a>
                  ) : null}
                  {a.message ? (
                    <p className="text-xs text-fg-muted">{a.message}</p>
                  ) : null}
                  {a.instructions ? (
                    <p className="text-xs text-fg">{a.instructions}</p>
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
