import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Apple,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  Monitor,
  X,
} from "lucide-react";
import { cn, formatUsd } from "@/lib/utils";

type DeliveryItem = {
  label: string;
  fileUrl: string | null;
  message: string | null;
  steps: string | null;
  instructions?: string | null;
  fileName?: string | null;
  hasUpload?: boolean;
  scopeKey?: string | null;
  os?: string | null;
};

type DeliveryByOs = {
  macos: DeliveryItem[];
  windows: DeliveryItem[];
};

type PreviewProduct = { id: string; label: string; category: string };

type PreviewPayload = {
  ok: boolean;
  isPreview?: boolean;
  previewNote?: string;
  payment: {
    sessionId: string;
    amountCents: number;
    productKey: string;
    productLabel: string | null;
    email: string | null;
    remainingSerials: number;
  };
  classification: {
    kind: string;
    exam?: string;
    tier?: string;
    flow: string;
  };
  machine: {
    keyName: string;
    status: string;
    os: string;
    productKey: string;
  };
  authCode: string;
  authCodePreview?: boolean;
  delivery: DeliveryItem[];
  deliveryByOs: DeliveryByOs;
};

function PreviewDeliveryBlock({
  items,
  byOs,
  preferredOs,
}: {
  items: DeliveryItem[];
  byOs?: DeliveryByOs | null;
  preferredOs?: "macos" | "windows" | null;
}) {
  const macos = byOs?.macos?.length
    ? byOs.macos
    : items.filter(
        (i) =>
          (i.os || "").includes("mac") || (i.scopeKey || "").includes("macos"),
      );
  const windows = byOs?.windows?.length
    ? byOs.windows
    : items.filter(
        (i) =>
          (i.os || "").includes("win") ||
          (i.scopeKey || "").includes("windows"),
      );
  const hasSplit = macos.length > 0 || windows.length > 0;
  const primary =
    preferredOs === "windows"
      ? windows
      : preferredOs === "macos"
        ? macos
        : [];
  const secondary =
    preferredOs === "windows"
      ? macos
      : preferredOs === "macos"
        ? windows
        : [];
  const fallback = items.length ? items : [...macos, ...windows];

  function renderList(list: DeliveryItem[], title: string) {
    if (!list.length) {
      return (
        <p className="text-xs text-fg-muted">
          {title}: no build uploaded yet — assign macOS / Windows in Delivery.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          {title}
        </p>
        {list.map((d, i) => (
          <div
            key={`${title}-${i}`}
            className="space-y-2 rounded-xl border border-border/80 bg-white/70 p-3"
          >
            <p className="font-semibold text-fg">{d.label}</p>
            {d.message ? (
              <p className="text-xs text-fg-muted">{d.message}</p>
            ) : null}
            {d.instructions ? (
              <p className="whitespace-pre-wrap text-xs text-fg">
                {d.instructions}
              </p>
            ) : null}
            {d.steps ? (
              <pre className="whitespace-pre-wrap rounded-lg bg-bg-soft p-2 text-[11px] text-fg">
                {d.steps}
              </pre>
            ) : null}
            {d.fileUrl ? (
              <a
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-fg hover:opacity-90"
              >
                {d.fileName ? `Download ${d.fileName}` : "Download app"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="text-xs text-muted">
                Download link pending for this OS.
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (!fallback.length && !hasSplit) {
    return (
      <p className="text-xs text-fg-muted">
        No delivery assets configured for this product yet. Upload builds in
        Admin → Delivery.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-green-200 bg-white/80 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">
        App download
      </p>
      {preferredOs && (primary.length || secondary.length) ? (
        <>
          {renderList(
            primary.length ? primary : fallback,
            preferredOs === "macos"
              ? "Your platform · macOS"
              : "Your platform · Windows",
          )}
          {secondary.length ? (
            <details className="rounded-lg border border-border/70 p-2">
              <summary className="cursor-pointer text-xs font-semibold text-primary">
                Also available ·{" "}
                {preferredOs === "macos" ? "Windows" : "macOS"}
              </summary>
              <div className="mt-2">
                {renderList(
                  secondary,
                  preferredOs === "macos" ? "Windows" : "macOS",
                )}
              </div>
            </details>
          ) : null}
        </>
      ) : hasSplit ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {renderList(macos, "macOS")}
          {renderList(windows, "Windows")}
        </div>
      ) : (
        renderList(fallback, "Download")
      )}
    </div>
  );
}

/**
 * Admin tool: pick a catalog product and open a modal that mirrors the
 * post-purchase /activate success screen (real delivery assets + PREVIEW auth code).
 */
export function BuyerPreviewCard() {
  const [products, setProducts] = useState<PreviewProduct[]>([]);
  const [productKey, setProductKey] = useState("sat-pro");
  const [os, setOs] = useState<"macos" | "windows">("macos");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/preview-activate?list=1", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load products");
      const list = (data.products || []) as PreviewProduct[];
      setProducts(list);
      if (list.length && !list.some((p) => p.id === productKey)) {
        setProductKey(list[0]!.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load products");
    }
  }, [productKey]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function openPreview() {
    if (!productKey.trim()) {
      toast.error("Select a product");
      return;
    }
    setLoading(true);
    setPreview(null);
    setOpen(true);
    try {
      const qs = new URLSearchParams({
        productKey: productKey.trim(),
        os,
      });
      const res = await fetch(
        `/api/admin/preview-activate?${qs.toString()}`,
        { credentials: "include" },
      );
      const data = (await res.json()) as PreviewPayload & { error?: string };
      if (!res.ok) throw new Error(data?.error || "Preview failed");
      setPreview(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  const grouped = products.reduce<Record<string, PreviewProduct[]>>((acc, p) => {
    const cat = p.category || "other";
    (acc[cat] ||= []).push(p);
    return acc;
  }, {});

  return (
    <>
      <Card className="border-primary/25 bg-primary-soft/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-primary" />
            Preview buyer experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-fg-muted">
            See exactly what a buyer gets on <code className="font-mono text-xs">/activate</code>{" "}
            after purchasing a package — real delivery assets for macOS/Windows,
            with a labeled <strong>PREVIEW</strong> auth code (sample only,
            nothing is written to the whitelist).
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="previewProduct">Software / package</Label>
              <Select
                id="previewProduct"
                value={productKey}
                onChange={(e) => setProductKey(e.target.value)}
              >
                {Object.entries(grouped).map(([cat, list]) => (
                  <optgroup key={cat} label={cat.toUpperCase()}>
                    {list.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} ({p.id})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Buyer OS</Label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setOs("macos")}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-xl border-2 px-3 text-sm font-bold",
                    os === "macos"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-fg-muted",
                  )}
                >
                  <Apple className="h-4 w-4" />
                  macOS
                </button>
                <button
                  type="button"
                  onClick={() => setOs("windows")}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-xl border-2 px-3 text-sm font-bold",
                    os === "windows"
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-fg-muted",
                  )}
                >
                  <Monitor className="h-4 w-4" />
                  Windows
                </button>
              </div>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => void openPreview()}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                Open buyer popup
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[2px] sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Buyer activate preview"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative my-4 w-full max-w-2xl rounded-3xl border border-border bg-bg shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-3xl border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-amber-300 bg-amber-100 text-amber-900">
                    ADMIN PREVIEW
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {productKey}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs text-fg-muted">
                  Mirrors post-purchase /activate — not a live session
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              {loading || !preview ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resolving delivery for {productKey}…
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                    {preview.previewNote ||
                      "Preview only — PREVIEW auth code is not redeemable."}
                  </div>

                  <Card>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Verified payment
                        </p>
                        <p className="font-display text-xl font-bold text-fg">
                          {formatUsd(preview.payment.amountCents / 100)}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {preview.payment.productLabel ||
                            preview.payment.productKey}
                          {preview.payment.email
                            ? ` · ${preview.payment.email}`
                            : ""}
                        </p>
                      </div>
                      <Badge className="border-green-200 bg-green-100 text-green-800">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Paid
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                      <CardTitle className="text-base text-green-900">
                        Activated · {preview.machine.status}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-green-900">
                      <p>
                        <strong>{preview.machine.keyName}</strong> ·{" "}
                        {preview.machine.os} · {preview.machine.productKey}
                      </p>

                      <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50/90 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted">
                            Auth code
                          </p>
                          <Badge className="border-amber-400 bg-amber-200 text-[10px] text-amber-950">
                            SAMPLE / PREVIEW — not redeemable
                          </Badge>
                        </div>
                        <code className="block break-all rounded-lg bg-bg-soft px-3 py-2 font-mono text-xs text-fg">
                          {preview.authCode}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void copy(preview.authCode)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy preview code
                        </Button>
                        <p className="text-[11px] text-fg-muted">
                          Enter this auth code in the ExamHub app. (Preview
                          sample — not a real key.)
                        </p>
                      </div>

                      <PreviewDeliveryBlock
                        items={preview.delivery || []}
                        byOs={preview.deliveryByOs}
                        preferredOs={
                          preview.machine.os === "windows"
                            ? "windows"
                            : "macos"
                        }
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
