import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn, formatUsd } from "@/lib/utils";

export const Route = createFileRoute("/activate")({
  validateSearch: (s: Record<string, unknown>) => ({
    session_id:
      typeof s.session_id === "string"
        ? s.session_id
        : typeof s.sessionId === "string"
          ? s.sessionId
          : undefined,
  }),
  component: ActivatePage,
  head: () => ({
    meta: [
      { title: "Activate purchase | ExamHub" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

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

type SessionPayload = {
  ok: boolean;
  payment: {
    sessionId: string;
    amountCents: number;
    productKey: string;
    productLabel: string | null;
    email: string | null;
    consumeCount: number;
    maxSerials: number;
    remainingSerials: number;
  };
  classification: {
    kind: string;
    exam?: string;
    tier?: string;
    flow: "os_serial" | "progress" | "proctor_serial";
  };
  existingProject: {
    token: string;
    progress: number;
    status: string;
    progressUrl: string;
  } | null;
  authCode?: string | null;
  existingMachines?: Array<{
    id: string;
    keyName: string;
    status: string;
    os: string | null;
    productKey: string | null;
    authCode?: string | null;
  }>;
  delivery?: DeliveryItem[];
  deliveryByOs?: DeliveryByOs;
};

function DeliveryBlock({
  items,
  byOs,
  preferredOs,
}: {
  items: DeliveryItem[];
  byOs?: DeliveryByOs | null;
  preferredOs?: "macos" | "windows" | null;
}) {
  const macos = byOs?.macos?.length ? byOs.macos : items.filter((i) => (i.os || "").includes("mac") || (i.scopeKey || "").includes("macos"));
  const windows = byOs?.windows?.length
    ? byOs.windows
    : items.filter((i) => (i.os || "").includes("win") || (i.scopeKey || "").includes("windows"));
  const hasSplit = macos.length > 0 || windows.length > 0;
  const primary = preferredOs === "windows" ? windows : preferredOs === "macos" ? macos : [];
  const secondary = preferredOs === "windows" ? macos : preferredOs === "macos" ? windows : [];
  const fallback = items.length ? items : [...macos, ...windows];

  function renderList(list: DeliveryItem[], title: string) {
    if (!list.length) {
      return (
        <p className="text-xs text-fg-muted">
          {title}: no build uploaded yet — admin can assign macOS / Windows files
          in Delivery.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          {title}
        </p>
        {list.map((d, i) => (
          <div key={`${title}-${i}`} className="space-y-2 rounded-xl border border-border/80 bg-white/70 p-3 dark:bg-surface">
            <p className="font-semibold text-fg">{d.label}</p>
            {d.message ? (
              <p className="text-xs text-fg-muted">{d.message}</p>
            ) : null}
            {d.instructions ? (
              <p className="whitespace-pre-wrap text-xs text-fg">{d.instructions}</p>
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
        App download / steps appear here when admin sets delivery for your OS and
        tier (or the universal proctor pack).
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-green-200 bg-white/80 p-3 dark:bg-surface">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">
        App download
      </p>
      {preferredOs && (primary.length || secondary.length) ? (
        <>
          {renderList(
            primary.length ? primary : fallback,
            preferredOs === "macos" ? "Your platform · macOS" : "Your platform · Windows",
          )}
          {secondary.length ? (
            <details className="rounded-lg border border-border/70 p-2">
              <summary className="cursor-pointer text-xs font-semibold text-primary">
                Also available · {preferredOs === "macos" ? "Windows" : "macOS"}
              </summary>
              <div className="mt-2">{renderList(secondary, preferredOs === "macos" ? "Windows" : "macOS")}</div>
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

function ActivatePage() {
  const { isAdmin } = Route.useRouteContext();
  const { session_id: sessionFromUrl } = Route.useSearch();
  const [sessionId, setSessionId] = useState(sessionFromUrl || "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [os, setOs] = useState<"macos" | "windows" | null>(null);
  const [exam, setExam] = useState<"sat" | "act" | "gmat" | "gre">("sat");
  const [done, setDone] = useState<{
    machine?: {
      keyName: string;
      status: string;
      os: string;
      productKey: string;
    };
    authCode?: string | null;
    delivery?: DeliveryItem[];
    deliveryByOs?: DeliveryByOs;
    remainingSerials?: number;
    progressUrl?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const [contactMethod, setContactMethod] = useState("email");
  const [contactValue, setContactValue] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async (sid: string) => {
    if (!sid.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/activate/session?session_id=${encodeURIComponent(sid.trim())}`,
        { credentials: "include" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Could not verify payment");
      const payload = json as SessionPayload;
      setData(payload);

      if (payload.existingProject?.progressUrl) {
        setDone({ progressUrl: payload.existingProject.progressUrl });
      } else if (
        payload.authCode ||
        payload.existingMachines?.some((m) => m.authCode)
      ) {
        const m = payload.existingMachines?.[0];
        const code =
          payload.authCode ||
          payload.existingMachines?.find((x) => x.authCode)?.authCode ||
          null;
        setDone({
          machine: m
            ? {
                keyName: m.keyName,
                status: m.status,
                os: m.os || "—",
                productKey: m.productKey || payload.payment.productKey,
              }
            : {
                keyName: "Auth code",
                status: "active",
                os: "—",
                productKey: payload.payment.productKey,
              },
          authCode: code,
          delivery: payload.delivery || [],
          deliveryByOs: payload.deliveryByOs,
          remainingSerials: 0,
        });
      } else {
        setDone(null);
      }
    } catch (e) {
      setData(null);
      setDone(null);
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionFromUrl) {
      setSessionId(sessionFromUrl);
      void load(sessionFromUrl);
    }
  }, [sessionFromUrl, load]);

  const needsExamPick = useMemo(() => {
    if (!data) return false;
    const k = data.payment.productKey.toLowerCase();
    return ["standard", "pro", "premium"].includes(k);
  }, [data]);

  async function issueAuth(e?: React.FormEvent) {
    e?.preventDefault();
    if (!data) return;
    if (needsExamPick && !exam) {
      toast.error("Pick an exam");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/activate/session", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: data.payment.sessionId,
          action: "issue_auth",
          os: os || undefined,
          exam: needsExamPick ? exam : data.classification.exam,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Could not issue auth code");
      setDone({
        machine: json.machine,
        authCode: json.authCode || null,
        delivery: json.delivery,
        deliveryByOs: json.deliveryByOs,
        remainingSerials: 0,
      });
      toast.success("Auth code ready");
      void load(data.payment.sessionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    try {
      const res = await fetch("/api/activate/session", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: data.payment.sessionId,
          action: "create_project",
          contactMethod,
          contactValue,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Could not create project");
      setDone({ progressUrl: json.progressUrl });
      toast.success("Progress link ready");
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

  const showExamPick =
    data &&
    (data.classification.flow === "os_serial" ||
      data.classification.flow === "proctor_serial") &&
    !done?.authCode &&
    needsExamPick;

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Badge className="mb-2">Post-purchase</Badge>
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
          Activate your purchase
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Stripe verifies payment automatically. Software purchases give you an{" "}
          <strong>auth code</strong> and <strong>app download</strong> — enter
          the code in the ExamHub app (no serial). Research / internship →
          progress link.
        </p>

        {!sessionFromUrl ? (
          <Card className="mt-6">
            <CardContent className="space-y-3 p-5">
              <Label htmlFor="sid">Stripe session ID</Label>
              <Input
                id="sid"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="cs_live_… (from success URL)"
                className="font-mono text-xs"
              />
              <Button
                type="button"
                disabled={loading || !sessionId.trim()}
                onClick={() => void load(sessionId)}
              >
                {loading ? "Checking…" : "Verify payment"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying payment with Stripe…
          </div>
        ) : null}

        {error ? (
          <Card className="mt-6 border-red-200 bg-red-50/80">
            <CardContent className="space-y-3 p-5 text-sm text-red-800">
              <p className="font-semibold">{error}</p>
              <p className="text-xs">
                If you just paid, wait a few seconds and retry — the webhook may
                still be landing. You can also paste the session id from the
                success URL.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sessionId && void load(sessionId)}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {data && !loading ? (
          <div className="mt-6 space-y-4">
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Verified payment
                  </p>
                  <p className="font-display text-xl font-bold text-fg">
                    {formatUsd(data.payment.amountCents / 100)}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {data.payment.productKey}
                    {data.payment.email ? ` · ${data.payment.email}` : ""}
                  </p>
                </div>
                <Badge className="border-green-200 bg-green-100 text-green-800">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Paid
                </Badge>
              </CardContent>
            </Card>

            {done?.progressUrl ? (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">Your progress link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-fg-muted">
                    Bookmark this page. Admin updates the bar and attaches your
                    file when ready — delivery unlocks at 100%.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={done.progressUrl}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-fg"
                    >
                      Open progress
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copy(done.progressUrl!)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {done?.machine ? (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-base text-green-900">
                    Activated · {done.machine.status}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-green-900">
                  <p>
                    <strong>{done.machine.keyName}</strong>
                    {done.machine.productKey
                      ? ` · ${done.machine.productKey}`
                      : ""}
                  </p>

                  <div className="space-y-2 rounded-xl border border-green-300 bg-white/90 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">
                      Auth code
                    </p>
                    {done.authCode ? (
                      <>
                        <code className="block break-all rounded-lg bg-bg-soft px-3 py-2 font-mono text-xs text-fg">
                          {done.authCode}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void copy(done.authCode!)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy auth code
                        </Button>
                        <p className="text-[11px] text-fg-muted">
                          Enter this auth code in the ExamHub app.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-fg-muted">
                        Auth code unavailable — contact support with your
                        session ID.
                      </p>
                    )}
                  </div>

                  <DeliveryBlock
                    items={done.delivery || data.delivery || []}
                    byOs={done.deliveryByOs || data.deliveryByOs}
                    preferredOs={
                      done.machine?.os === "windows"
                        ? "windows"
                        : done.machine?.os === "macos"
                          ? "macos"
                          : os
                    }
                  />
                </CardContent>
              </Card>
            ) : null}

            {data.classification.flow === "progress" && !done?.progressUrl ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {data.classification.kind === "internship"
                      ? "Internship"
                      : "Research paper"}{" "}
                    · contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createProject} className="space-y-4">
                    <p className="text-sm text-fg-muted">
                      We generate a private progress link. Admin moves the bar
                      and attaches delivery when finished.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Contact method</Label>
                        <Select
                          value={contactMethod}
                          onChange={(e) => setContactMethod(e.target.value)}
                        >
                          <option value="email">Email</option>
                          <option value="discord">Discord</option>
                          <option value="instagram">Instagram</option>
                          <option value="telegram">Telegram</option>
                          <option value="whatsapp">WhatsApp</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Contact</Label>
                        <Input
                          required
                          value={contactValue}
                          onChange={(e) => setContactValue(e.target.value)}
                          placeholder="@you or email"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[72px]"
                        placeholder="Subject, field, deadline…"
                      />
                    </div>
                    <Button type="submit" disabled={busy} className="w-full">
                      {busy ? "Creating…" : "Create progress link"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {showExamPick ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Choose your exam
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => void issueAuth(e)}
                    className="space-y-5"
                  >
                    <p className="text-sm text-fg-muted">
                      This payment is a bare tier — pick which exam pathway your
                      auth code should unlock.
                    </p>
                    <div className="space-y-2">
                      <Label>Exam</Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(["sat", "act", "gmat", "gre"] as const).map((x) => (
                          <button
                            key={x}
                            type="button"
                            onClick={() => setExam(x)}
                            className={cn(
                              "rounded-xl border px-3 py-3 text-sm font-bold uppercase",
                              exam === x
                                ? "border-primary bg-primary-soft text-primary"
                                : "border-border bg-surface text-fg-muted",
                            )}
                          >
                            {x}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" disabled={busy} className="w-full">
                      {busy ? "Issuing…" : "Get auth code"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {/* Software purchase without auth yet (should be rare — GET auto-issues) */}
            {data &&
            (data.classification.flow === "os_serial" ||
              data.classification.flow === "proctor_serial") &&
            !done?.authCode &&
            !showExamPick ? (
              <Card>
                <CardContent className="space-y-3 p-5">
                  <p className="text-sm text-fg-muted">
                    Preparing your auth code…
                  </p>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void issueAuth()}
                  >
                    {busy ? "Issuing…" : "Get auth code"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-muted">
          Need help? Message support on Telegram from the header.
        </p>
      </div>
    </Shell>
  );
}
