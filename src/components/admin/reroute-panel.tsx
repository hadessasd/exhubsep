import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Send, Trash2 } from "lucide-react";

type ProxyLog = {
  id: string;
  createdAt: string;
  clientIp: string | null;
  requestBody: string;
  apiKeyHint: string | null;
  upstreamStatus: number | null;
  success: boolean;
  durationMs: number | null;
  errorText: string | null;
};

const DEFAULT_BODY = JSON.stringify(
  {
    model: "google/gemini-2.5-flash",
    messages: [{ role: "user", content: "How many r's are in strawberry?" }],
  },
  null,
  2,
);

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  try {
    return { text, data: text ? JSON.parse(text) : null };
  } catch {
    return { text, data: null };
  }
}

export function ReroutePanel() {
  const [apiKey, setApiKey] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [result, setResult] = useState("");
  const [resultStatus, setResultStatus] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<ProxyLog[]>([]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reroute/logs", { credentials: "include" });
      const parsed = await parseJsonResponse(res);
      if (!res.ok) throw new Error(parsed.data?.error || parsed.text || "Failed to load logs");
      setLogs(Array.isArray(parsed.data) ? parsed.data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  async function sendTest() {
    if (!apiKey.trim()) {
      toast.error("Enter your OpenRouter API key");
      return;
    }
    try {
      JSON.parse(body);
    } catch {
      toast.error("Request body is not valid JSON");
      return;
    }
    setSending(true);
    setResult("");
    setResultStatus(null);
    try {
      const res = await fetch("/api/reroute/openrouter", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey.trim()}`,
          "x-title": "ExamHub Admin Test",
        },
        body,
      });
      const parsed = await parseJsonResponse(res);
      setResultStatus(res.status);
      setResult(parsed.data ? JSON.stringify(parsed.data, null, 2) : parsed.text);
      if (res.ok) toast.success(`Reroute successful · HTTP ${res.status}`);
      else toast.error(`Reroute failed · HTTP ${res.status}`);
      await loadLogs();
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Request failed");
      toast.error("Request failed");
    } finally {
      setSending(false);
    }
  }

  async function clearLogs() {
    if (!confirm("Clear all OpenRouter reroute logs?")) return;
    const res = await fetch("/api/admin/reroute/logs", {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const parsed = await parseJsonResponse(res);
      toast.error(parsed.data?.error || "Could not clear logs");
      return;
    }
    toast.success("Reroute logs cleared");
    await loadLogs();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>OpenRouter reroute tester</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-fg-muted">
            Public endpoint: <code className="font-mono">/api/reroute/openrouter</code>.
            The caller supplies their own OpenRouter key. The key is used only for the
            upstream request and is not stored in the request log.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="or-key">OpenRouter API key</Label>
            <Input
              id="or-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="or-body">JSON request body</Label>
            <Textarea
              id="or-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-56 font-mono text-xs"
            />
          </div>
          <Button type="button" disabled={sending} onClick={() => void sendTest()}>
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : "Send through ExamHub"}
          </Button>
          {result ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Response</span>
                {resultStatus != null ? (
                  <Badge variant="outline">HTTP {resultStatus}</Badge>
                ) : null}
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-xl bg-gray-950 p-4 text-xs text-gray-100">
                {result}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Reroute request logs</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={loading} onClick={() => void loadLogs()}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => void clearLogs()}>
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="p-2">Time</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Reroute</th>
                  <th className="p-2">Latency</th>
                  <th className="p-2">IP</th>
                  <th className="p-2">Key</th>
                  <th className="p-2">Request contents</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-muted">No reroute requests logged.</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/70 align-top">
                    <td className="whitespace-nowrap p-2 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-2"><Badge variant="outline">HTTP {log.upstreamStatus ?? "-"}</Badge></td>
                    <td className="p-2">
                      <Badge className={log.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {log.success ? "successful" : "failed"}
                      </Badge>
                      {log.errorText ? <div className="mt-1 max-w-48 text-xs text-red-600">{log.errorText}</div> : null}
                    </td>
                    <td className="p-2 text-xs">{log.durationMs == null ? "-" : `${log.durationMs} ms`}</td>
                    <td className="p-2 font-mono text-xs">{log.clientIp || "-"}</td>
                    <td className="p-2 font-mono text-xs">{log.apiKeyHint || "not supplied"}</td>
                    <td className="p-2">
                      <pre className="max-h-48 max-w-[520px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-bg-soft p-2 text-[11px]">{log.requestBody}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
