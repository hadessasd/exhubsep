import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Send } from "lucide-react";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
  head: () => ({
    meta: [
      { title: "Machine verification | ExamHub" },
      {
        name: "description",
        content:
          "Request machine verification on ExamHub. Admin reviews and approves keys.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function VerifyPage() {
  const { isAdmin } = Route.useRouteContext();
  const [machineId, setMachineId] = useState("");
  const [keyName, setKeyName] = useState("");
  const [hostname, setHostname] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    status?: string;
    message?: string;
    ok?: boolean;
  } | null>(null);

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!machineId.trim()) {
      toast.error("Machine ID required");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/whitelist/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: machineId.trim(),
          keyName: keyName.trim() || undefined,
          hostname: hostname.trim() || undefined,
          note: note.trim() || undefined,
          os: typeof navigator !== "undefined" ? navigator.platform : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setResult({
        ok: true,
        status: data.status,
        message: data.message,
      });
      toast.success(data.message || "Request submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setBusy(false);
    }
  }

  async function checkStatus() {
    if (!machineId.trim()) {
      toast.error("Machine ID required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/whitelist/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId: machineId.trim() }),
      });
      const data = await res.json();
      setResult({
        ok: !!data.ok,
        status: data.status,
        message: data.reason || data.status,
      });
      if (data.ok) toast.success("Machine is active");
      else toast.message(`Status: ${data.status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <Badge className="mb-2">Verification</Badge>
        <h1 className="font-display text-3xl font-bold text-fg">
          Request machine access
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Submit your machine ID. An admin reviews it on ExamHub, can set a time
          period or forever, add notes, approve, or terminate.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Machine details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={requestAccess} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mid">Machine ID / serial</Label>
                <Input
                  id="mid"
                  required
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  placeholder="Paste machine ID"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kn">Key name (optional)</Label>
                <Input
                  id="kn"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Your name or order ref"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hn">Hostname (optional)</Label>
                <Input
                  id="hn"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt">Note (optional)</Label>
                <Textarea
                  id="nt"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Product, Discord, etc."
                  className="min-h-[70px]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy} className="gap-1.5">
                  <Send className="h-4 w-4" />
                  {busy ? "Sending…" : "Request verification"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void checkStatus()}
                >
                  Check status
                </Button>
              </div>
            </form>

            {result ? (
              <div
                className={
                  "mt-4 rounded-xl border px-3 py-2 text-sm " +
                  (result.ok
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-amber-200 bg-amber-50 text-amber-900")
                }
              >
                <strong className="capitalize">{result.status || "unknown"}</strong>
                {result.message ? ` — ${result.message}` : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          Admin:{" "}
          <Link to="/admin" className="text-primary hover:underline">
            Dashboard → Machines
          </Link>
        </p>
      </div>
    </Shell>
  );
}
