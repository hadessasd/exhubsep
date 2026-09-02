import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  Apple,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Monitor,
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
  existingMachines?: Array<{
    id: string;
    keyName: string;
    status: string;
    os: string | null;
    productKey: string | null;
  }>;
  delivery?: DeliveryItem[];
};

function DeliveryBlock({ items }: { items: DeliveryItem[] }) {
  if (!items.length) {
    return (
      <p className="text-xs text-fg-muted">
        Bypass file / steps appear here when admin sets delivery for your OS and
        tier (or a universal proctor pack).
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-green-200 bg-white/80 p-3 dark:bg-surface">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">
        Delivery
      </p>
      {items.map((d, i) => (
        <div key={i} className="space-y-1">
          <p className="font-semibold text-fg">{d.label}</p>
          {d.message ? (
            <p className="text-xs text-fg-muted">{d.message}</p>
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
              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              Download / open file
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      ))}
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
  const [exam, setExam] = useState<"sat" | "act">("sat");
  const [serial, setSerial] = useState("");
  const [done, setDone] = useState<{
    machine?: {
      keyName: string;
      status: string;
      os: string;
      productKey: string;
    };
    delivery?: DeliveryItem[];
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
      } else if (payload.existingMachines?.length) {
        const m = payload.existingMachines[0]!;
        setDone({
          machine: {
            keyName: m.keyName,
            status: m.status,
            os: m.os || "—",
            productKey: m.productKey || payload.payment.productKey,
          },
          delivery: payload.delivery || [],
          remainingSerials: payload.payment.remainingSerials,
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

  const canAddAnotherSerial = useMemo(() => {
    if (!data) return false;
    return (
      (data.classification.flow === "os_serial" ||
        data.classification.flow === "proctor_serial") &&
      data.payment.remainingSerials > 0
    );
  }, [data]);

  async function registerSerial(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !os || !serial.trim()) {
      toast.error("Choose OS and enter serial");
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
          action: "register_serial",
          os,
          serial: serial.trim(),
          exam: needsExamPick ? exam : data.classification.exam,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Activation failed");
      setDone({
        machine: json.machine,
        delivery: json.delivery,
        remainingSerials: json.remainingSerials,
      });
      setSerial("");
      toast.success("Machine whitelisted · active");
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

  const showSerialForm =
    data &&
    (data.classification.flow === "os_serial" ||
      data.classification.flow === "proctor_serial") &&
    (!done?.machine || canAddAnotherSerial);

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Badge className="mb-2">Post-purchase</Badge>
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
          Activate your purchase
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Stripe verifies payment automatically. SAT/ACT → pick macOS or Windows
          and enter serial (auto-whitelist). Research / internship → progress
          link. Proctor tools → serial + steps.
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
                    Whitelisted · {done.machine.status}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-green-900">
                  <p>
                    <strong>{done.machine.keyName}</strong> · {done.machine.os}{" "}
                    · {done.machine.productKey}
                  </p>
                  {data.existingMachines && data.existingMachines.length > 1 ? (
                    <ul className="list-inside list-disc text-xs text-fg-muted">
                      {data.existingMachines.map((m) => (
                        <li key={m.id}>
                          {m.keyName} · {m.status}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {typeof done.remainingSerials === "number" &&
                  done.remainingSerials > 0 ? (
                    <p className="text-xs">
                      You can register {done.remainingSerials} more machine(s)
                      on this payment below.
                    </p>
                  ) : null}
                  <DeliveryBlock items={done.delivery || data.delivery || []} />
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

            {showSerialForm ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {data.classification.flow === "proctor_serial"
                      ? "Device whitelist + proctor steps"
                      : done?.machine
                        ? "Register another machine"
                        : "Choose OS & enter serial"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerSerial} className="space-y-5">
                    {needsExamPick ? (
                      <div className="space-y-2">
                        <Label>Exam</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {(["sat", "act"] as const).map((x) => (
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
                    ) : null}

                    <div className="space-y-2">
                      <Label>Operating system</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setOs("macos")}
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-6 transition",
                            os === "macos"
                              ? "border-primary bg-primary-soft shadow-sm"
                              : "border-border bg-surface hover:border-primary/40",
                          )}
                        >
                          <Apple className="h-8 w-8" />
                          <span className="font-bold">macOS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOs("windows")}
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-6 transition",
                            os === "windows"
                              ? "border-primary bg-primary-soft shadow-sm"
                              : "border-border bg-surface hover:border-primary/40",
                          )}
                        >
                          <Monitor className="h-8 w-8" />
                          <span className="font-bold">Windows</span>
                        </button>
                      </div>
                    </div>

                    {os ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="serial">
                          {os === "macos"
                            ? "Mac serial number"
                            : "Windows serial / machine ID"}
                        </Label>
                        <Input
                          id="serial"
                          required
                          value={serial}
                          onChange={(e) => setSerial(e.target.value)}
                          placeholder={
                            os === "macos"
                              ? "About This Mac → Serial Number"
                              : "BIOS / device serial"
                          }
                          className="font-mono text-sm"
                        />
                        <p className="text-[11px] text-muted">
                          Your serial is SHA-256 hashed server-side and only the hash is stored
                          for admin. Paid Stripe sessions auto-approve as{" "}
                          <strong>active</strong>.
                        </p>
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={busy || !os || !serial.trim()}
                    >
                      {busy ? "Whitelisting…" : "Activate & whitelist"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-muted">
          Manual device request (no payment)?{" "}
          <Link
            to="/verify"
            className="font-semibold text-primary hover:underline"
          >
            /verify
          </Link>
        </p>
      </div>
    </Shell>
  );
}
