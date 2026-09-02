import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ExternalLink,
  FlaskConical,
  Copy,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { cn, formatUsd } from "@/lib/utils";

type Preset = {
  id: string;
  amountCents: number;
  productKey: string;
  label: string;
};

type SimResult = {
  ok: boolean;
  simulated?: boolean;
  payment?: {
    sessionId: string;
    productKey: string;
    amountCents: number;
    email: string | null;
  };
  activateUrl?: string;
  progressUrl?: string;
  machine?: {
    id: string;
    keyName: string;
    status: string;
    os: string;
    productKey: string;
    source?: string;
  };
  delivery?: Array<{
    label: string;
    fileUrl: string | null;
    message: string | null;
    steps: string | null;
  }>;
  project?: {
    id: string;
    token: string;
    kind: string;
    progress: number;
    status: string;
  };
  hint?: string;
  error?: string;
};

const EXAM_PRODUCTS = new Set(["standard", "pro", "premium", "proctor"]);
const PROGRESS_PRODUCTS = new Set(["research", "internship"]);

export function SimulatePanel() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [product, setProduct] = useState("standard");
  const [email, setEmail] = useState("sim-buyer@examhub.local");
  const [action, setAction] = useState<"payment_only" | "whitelist" | "progress">(
    "payment_only",
  );
  const [os, setOs] = useState<"macos" | "windows">("macos");
  const [exam, setExam] = useState<"sat" | "act">("sat");
  const [serial, setSerial] = useState("");
  const [contactMethod, setContactMethod] = useState("discord");
  const [contactValue, setContactValue] = useState("@sim_buyer");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/simulate", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setPresets(data.presets || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load presets");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (PROGRESS_PRODUCTS.has(product) && action === "whitelist") {
      setAction("progress");
    }
    if (EXAM_PRODUCTS.has(product) && action === "progress") {
      setAction("payment_only");
    }
  }, [product, action]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/simulate", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product,
          email,
          action,
          os,
          serial: serial.trim() || undefined,
          exam,
          contactMethod,
          contactValue,
          notes,
        }),
      });
      const data = (await res.json()) as SimResult;
      if (!res.ok) throw new Error(data?.error || "Simulation failed");
      setResult(data);
      toast.success(
        action === "whitelist"
          ? "Simulated pay + whitelist (active)"
          : action === "progress"
            ? "Simulated pay + progress link"
            : "Fake payment created — open Activate",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
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

  const isExam = EXAM_PRODUCTS.has(product);
  const isProgress = PROGRESS_PRODUCTS.has(product);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-fg">
          <FlaskConical className="h-5 w-5 text-primary" />
          Payment & whitelist simulation
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-fg-muted">
          No Stripe, no real charge. Creates a fake paid session the same way a
          webhook would, then either opens Activate like a buyer, or instantly
          whitelists a serial / creates a progress link.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "1 · Fake payment only",
            body: "Get an Activate link. Walk OS + serial or contact yourself.",
          },
          {
            title: "2 · Pay + whitelist",
            body: "One click: paid + serial → Machines tab shows active (source: stripe).",
          },
          {
            title: "3 · Pay + progress",
            body: "Research/internship: contact → Progress tab + buyer link.",
          },
        ].map((c) => (
          <Card key={c.title}>
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {c.title}
              </p>
              <p className="mt-1 text-sm text-fg-muted">{c.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={run} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Product</Label>
              <div className="flex flex-wrap gap-2">
                {(presets.length
                  ? presets
                  : [
                      {
                        id: "standard",
                        label: "Standard $190",
                        amountCents: 19000,
                        productKey: "standard",
                      },
                    ]
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProduct(p.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-xs font-semibold transition",
                      product === p.id
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-surface text-fg-muted hover:border-primary/40",
                    )}
                  >
                    <span className="block font-bold">{p.label}</span>
                    <span className="font-mono text-[10px] opacity-70">
                      {p.productKey} · {formatUsd(p.amountCents / 100)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sim-email">Buyer email</Label>
              <Input
                id="sim-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>What to simulate</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAction("payment_only")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-bold",
                    action === "payment_only"
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-border",
                  )}
                >
                  Payment only → Activate
                </button>
                {isExam ? (
                  <button
                    type="button"
                    onClick={() => setAction("whitelist")}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-bold",
                      action === "whitelist"
                        ? "border-primary bg-primary text-primary-fg"
                        : "border-border",
                    )}
                  >
                    Pay + whitelist serial
                  </button>
                ) : null}
                {isProgress ? (
                  <button
                    type="button"
                    onClick={() => setAction("progress")}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-bold",
                      action === "progress"
                        ? "border-primary bg-primary text-primary-fg"
                        : "border-border",
                    )}
                  >
                    Pay + progress link
                  </button>
                ) : null}
              </div>
            </div>

            {action === "whitelist" ? (
              <>
                {product !== "proctor" ? (
                  <div className="space-y-1.5">
                    <Label>Exam</Label>
                    <div className="flex gap-2">
                      {(["sat", "act"] as const).map((x) => (
                        <button
                          key={x}
                          type="button"
                          onClick={() => setExam(x)}
                          className={cn(
                            "flex-1 rounded-xl border py-2 text-sm font-bold uppercase",
                            exam === x
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-border",
                          )}
                        >
                          {x}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label>OS</Label>
                  <div className="flex gap-2">
                    {(["macos", "windows"] as const).map((x) => (
                      <button
                        key={x}
                        type="button"
                        onClick={() => setOs(x)}
                        className={cn(
                          "flex-1 rounded-xl border py-2 text-sm font-bold capitalize",
                          os === x
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border",
                        )}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="sim-serial">Serial / machine ID</Label>
                  <Input
                    id="sim-serial"
                    required
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                    placeholder="e.g. C02TESTMAC999"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted">
                    Hashed with SHA-256 for the whitelist. The raw serial is not stored.
                    Status = active (same as Stripe auto-verify).
                  </p>
                </div>
              </>
            ) : null}

            {action === "progress" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Contact method</Label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                    value={contactMethod}
                    onChange={(e) => setContactMethod(e.target.value)}
                  >
                    <option value="email">Email</option>
                    <option value="discord">Discord</option>
                    <option value="instagram">Instagram</option>
                    <option value="telegram">Telegram</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Contact</Label>
                  <Input
                    required
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[60px]"
                    placeholder="Optional"
                  />
                </div>
              </>
            ) : null}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Run simulation
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result?.ok ? (
        <Card className="border-green-200 bg-green-50/40">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base text-green-900">
              Simulation OK
              <Badge className="bg-green-100 text-green-800 border-green-200">
                no real charge
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-green-950">
            {result.payment ? (
              <div className="rounded-xl border border-green-200 bg-white/80 p-3 font-mono text-xs">
                <div>
                  session: <strong>{result.payment.sessionId}</strong>
                </div>
                <div>
                  product: {result.payment.productKey} ·{" "}
                  {formatUsd(result.payment.amountCents / 100)} ·{" "}
                  {result.payment.email}
                </div>
              </div>
            ) : null}

            {result.machine ? (
              <div className="rounded-xl border border-green-200 bg-white/80 p-3">
                <p className="font-bold">
                  Whitelisted · {result.machine.status}
                </p>
                <p className="text-xs">
                  {result.machine.keyName} · {result.machine.os} ·{" "}
                  {result.machine.productKey}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Check Admin → Machines — source should be stripe.
                </p>
              </div>
            ) : null}

            {result.delivery?.length ? (
              <div className="space-y-1 rounded-xl border border-green-200 bg-white/80 p-3">
                <p className="text-xs font-bold uppercase text-muted">
                  Delivery attached
                </p>
                {result.delivery.map((d, i) => (
                  <div key={i}>
                    <p className="font-semibold">{d.label}</p>
                    {d.fileUrl ? (
                      <a
                        href={d.fileUrl}
                        className="text-xs text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {d.fileUrl}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {result.progressUrl ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href={result.progressUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-fg"
                >
                  Open progress
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copy(result.progressUrl!)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            ) : null}

            {result.activateUrl ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href={result.activateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary bg-primary-soft px-4 py-2 text-sm font-bold text-primary"
                >
                  Open Activate (buyer view)
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copy(result.activateUrl!)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Activate URL
                </Button>
              </div>
            ) : null}

            {result.hint ? (
              <p className="text-xs text-fg-muted">{result.hint}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
