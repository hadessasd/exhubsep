import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download,
  Upload,
  RefreshCw,
  Search,
  FileJson,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Machine = {
  id: string;
  keyName: string;
  serialNumber: string;
  hostname: string | null;
  note: string | null;
  status: string;
  expiresAt: string | null;
  sessionToken: string | null;
  lastSeenAt: string | null;
  lastIp: string | null;
  city: string | null;
  country: string | null;
  os: string | null;
  isAdmin: string | null;
  productKey?: string | null;
  source?: string | null;
  stripeSessionId?: string | null;
  rawSerialNote?: string | null;
};

async function fetchJson<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || "Invalid server response" };
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.reason || text || "Request failed");
  }
  return data as T;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Forever";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function isExpiredLocal(machine: Machine) {
  if (!machine.expiresAt) return false;
  const t = new Date(machine.expiresAt).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

function getFinalStatus(machine: Machine) {
  if (isExpiredLocal(machine)) return "expired";
  return machine.status || "unknown";
}

function statusClass(status: string) {
  if (status === "active") return "text-green-700 bg-green-50 border-green-200";
  if (status === "pending") return "text-amber-700 bg-amber-50 border-amber-200";
  if (status === "blocked" || status === "expired")
    return "text-red-700 bg-red-50 border-red-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

export function MachinesPanel() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");

  const [editId, setEditId] = useState("");
  const [keyName, setKeyName] = useState("");
  const [rawSerial, setRawSerial] = useState("");
  const [machineInput, setMachineInput] = useState("");
  const [hostname, setHostname] = useState("");
  const [status, setStatus] = useState("active");
  const [expiresAt, setExpiresAt] = useState("");
  const [forever, setForever] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMachines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<Machine[]>("/api/admin/whitelist/machines");
      setMachines(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load machines");
      setMachines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMachines();
    const t = setInterval(() => void loadMachines(), 15000);
    return () => clearInterval(t);
  }, [loadMachines]);

  const stats = useMemo(() => {
    const total = machines.length;
    const active = machines.filter((m) => getFinalStatus(m) === "active").length;
    const pending = machines.filter((m) => getFinalStatus(m) === "pending").length;
    const bad = machines.filter((m) => {
      const s = getFinalStatus(m);
      return s === "blocked" || s === "expired";
    }).length;
    return { total, active, pending, bad };
  }, [machines]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return machines;
    return machines.filter((m) =>
      [
        m.keyName,
        m.hostname,
        m.note,
        m.status,
        m.city,
        m.country,
        m.os,
        m.lastIp,
        m.serialNumber,
        m.productKey,
        m.source,
        m.rawSerialNote,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [machines, search]);

  function clearForm() {
    setEditId("");
    setKeyName("");
    setRawSerial("");
    setMachineInput("");
    setHostname("");
    setStatus("active");
    setExpiresAt("");
    setForever(true);
    setNote("");
  }

  function editMachine(machine: Machine) {
    setEditId(machine.id || "");
    setKeyName(machine.keyName || "");
    setMachineInput("");
    setRawSerial(machine.rawSerialNote || "");
    setHostname(machine.hostname || "");
    setStatus(machine.status || "active");
    setNote(machine.note || "");
    if (machine.expiresAt) {
      setForever(false);
      const date = new Date(machine.expiresAt);
      setExpiresAt(
        Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16),
      );
    } else {
      setForever(true);
      setExpiresAt("");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error("Enter a key name");
      return;
    }
    const mid = machineInput.trim() || rawSerial.trim();
    if (!editId && !mid) {
      toast.error("Enter a machine ID / serial");
      return;
    }
    setSaving(true);
    try {
      await fetchJson("/api/admin/whitelist/machines", {
        method: "POST",
        body: JSON.stringify({
          id: editId || undefined,
          keyName: keyName.trim(),
          machineInput: mid,
          hostname: hostname.trim(),
          note: note.trim(),
          status,
          forever,
          expiresAt:
            forever || !expiresAt
              ? null
              : new Date(expiresAt).toISOString(),
        }),
      });
      toast.success(editId ? "Machine updated" : "Machine saved");
      clearForm();
      await loadMachines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function approveMachine(machine: Machine) {
    try {
      await fetchJson("/api/admin/whitelist/machines", {
        method: "POST",
        body: JSON.stringify({
          id: machine.id,
          keyName: machine.keyName || "Approved Key",
          machineInput: "",
          hostname: machine.hostname || "",
          note: machine.note || "",
          status: "active",
          forever: true,
          expiresAt: null,
        }),
      });
      toast.success("Approved · active forever");
      await loadMachines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    }
  }

  async function blockMachine(machine: Machine) {
    try {
      await fetchJson("/api/admin/whitelist/machines", {
        method: "POST",
        body: JSON.stringify({
          id: machine.id,
          keyName: machine.keyName,
          status: "blocked",
          forever: !machine.expiresAt,
          expiresAt: machine.expiresAt,
          note: machine.note,
          hostname: machine.hostname,
        }),
      });
      toast.success("Terminated / blocked");
      await loadMachines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Block failed");
    }
  }

  async function deleteMachine(id: string) {
    if (!confirm("Remove this key?")) return;
    try {
      await fetchJson(`/api/admin/whitelist/machines/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      toast.success("Removed");
      await loadMachines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  }

  async function regenerateToken(id: string) {
    if (!confirm("Regenerate session token?")) return;
    try {
      await fetchJson(
        `/api/admin/whitelist/machines/${encodeURIComponent(id)}/regenerate-token`,
        { method: "POST" },
      );
      toast.success("New token issued");
      await loadMachines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Token failed");
    }
  }

  async function viewJson() {
    if (jsonOpen) {
      setJsonOpen(false);
      return;
    }
    setJsonOpen(true);
    setJsonText("Loading...");
    try {
      const res = await fetch("/api/admin/whitelist/json", {
        credentials: "include",
      });
      setJsonText(await res.text());
    } catch (err) {
      setJsonText(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onUpload(file: File) {
    let parsed: { machines?: unknown[] };
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      toast.error("Invalid JSON file");
      return;
    }
    if (!parsed || !Array.isArray(parsed.machines)) {
      toast.error("JSON must contain a machines array");
      return;
    }
    if (importMode === "replace") {
      if (!confirm("Replace current machine list?")) return;
    }
    try {
      await fetchJson("/api/admin/whitelist/import", {
        method: "POST",
        body: JSON.stringify({
          mode: importMode,
          importData: JSON.stringify(parsed),
        }),
      });
      toast.success("Import complete");
      await loadMachines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-2xl font-black text-fg">
            Machine Whitelist
          </h2>
          <p className="mt-1 text-sm font-medium text-fg-muted">
            Approve external requests, edit keys, import/export. Stripe
            activations land as <strong>active</strong> automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadMachines()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              window.location.href = "/api/admin/whitelist/export";
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download JSON
          </Button>
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
                e.target.value = "";
              }}
            />
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-sm font-bold text-white hover:bg-amber-600">
              <Upload className="h-3.5 w-3.5" />
              Upload JSON
            </span>
          </label>
          <Button
            type="button"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => void viewJson()}
          >
            <FileJson className="h-3.5 w-3.5" />
            View JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <Shield className="h-4 w-4 text-primary" />
              {editId ? "Edit key" : "Add / Edit key"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form id="machineForm" onSubmit={onSave} className="space-y-4">
              <input type="hidden" value={editId} readOnly />
              <div className="space-y-1.5">
                <Label htmlFor="keyName">Key name</Label>
                <Input
                  id="keyName"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. SAT Pro · Client A"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rawSerial" className="text-blue-600">
                    Serial input (SHA-256 on save)
                  </Label>
                  <Input
                    id="rawSerial"
                    value={rawSerial}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRawSerial(v);
                      setMachineInput(v);
                    }}
                    placeholder="e.g. C02ABC123XYZ"
                    className="border-blue-100 bg-blue-50/80 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="machineInput">Serial / machine ID</Label>
                  <Input
                    id="machineInput"
                    value={machineInput}
                    onChange={(e) => setMachineInput(e.target.value)}
                    placeholder="Raw serial; server hashes it before storing"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="hostname">Hostname</Label>
                  <Input
                    id="hostname"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="active">active</option>
                    <option value="pending">pending</option>
                    <option value="blocked">blocked</option>
                    <option value="expired">expired</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt">Expire date</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  disabled={forever}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <label className="mt-1 flex items-center gap-2 text-sm font-bold text-fg-muted">
                  <input
                    id="forever"
                    type="checkbox"
                    checked={forever}
                    onChange={(e) => {
                      setForever(e.target.checked);
                      if (e.target.checked) setExpiresAt("");
                    }}
                  />
                  Keep forever
                </label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Note / decrypted serial</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[80px] resize-y"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save key"}
                </Button>
                <Button type="button" variant="outline" onClick={clearForm}>
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {[
            { label: "Total keys", value: stats.total, color: "text-fg" },
            { label: "Active", value: stats.active, color: "text-green-600" },
            { label: "Pending", value: stats.pending, color: "text-amber-500" },
            {
              label: "Blocked / expired",
              value: stats.bad,
              color: "text-red-500",
            },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <p className="text-sm font-black text-muted">{s.label}</p>
                <h3 className={cn("mt-2 font-display text-4xl font-black", s.color)}>
                  {s.value}
                </h3>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="space-y-2 p-5">
              <Label htmlFor="importMode">Upload mode</Label>
              <Select
                id="importMode"
                value={importMode}
                onChange={(e) =>
                  setImportMode(
                    e.target.value === "replace" ? "replace" : "merge",
                  )
                }
              >
                <option value="merge">Merge with current list</option>
                <option value="replace">Replace current list</option>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black">Current keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              id="searchBox"
              className="pl-9"
              placeholder="Search by IP, location, SHA-256 hash, product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {jsonOpen ? (
            <pre className="max-h-[400px] overflow-auto rounded-2xl bg-gray-900 p-4 text-xs text-green-300">
              {jsonText}
            </pre>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-border text-left text-xs uppercase tracking-widest text-muted">
                  <th className="p-3">Key details</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Expiry</th>
                  <th className="p-3">Last seen</th>
                  <th className="p-3">IP & location</th>
                  <th className="p-3">Session token</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody id="machinesTable">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-sm font-bold text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-sm font-bold text-muted">
                      No keys found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((machine) => {
                    const st = getFinalStatus(machine);
                    return (
                      <tr
                        key={machine.id}
                        className="border-b border-border/80 align-top"
                      >
                        <td className="p-3">
                          <div className="font-black text-fg">
                            {machine.keyName || "Unnamed Key"}
                          </div>
                          <div className="mt-0.5 inline-block rounded-md bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary break-all">
                            Hash: {machine.serialNumber || "None Saved"}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {machine.source ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] capitalize",
                                  machine.source === "stripe"
                                    ? "border-green-300 text-green-700"
                                    : machine.source === "request"
                                      ? "border-amber-300 text-amber-700"
                                      : "",
                                )}
                              >
                                {machine.source}
                              </Badge>
                            ) : null}
                            {machine.productKey ? (
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {machine.productKey}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs font-bold text-muted">
                            Hostname: {machine.hostname || "-"}
                          </div>
                          <div
                            className="mt-1 break-all font-mono text-[10px] text-muted"
                            title={machine.serialNumber || machine.id}
                          >
                            SHA-256: {machine.serialNumber || "-"}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            className={cn(
                              "border font-black capitalize",
                              statusClass(st),
                            )}
                          >
                            {st}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm font-bold text-fg-muted">
                          {formatDate(machine.expiresAt)}
                        </td>
                        <td className="p-3 text-sm font-bold text-fg-muted">
                          {formatDate(machine.lastSeenAt)}
                        </td>
                        <td className="p-3">
                          <div className="font-black text-fg">
                            {machine.lastIp || "0.0.0.0"}
                          </div>
                          <div className="mt-0.5 text-xs font-bold text-muted">
                            {machine.city || "-"}, {machine.country || "-"}
                          </div>
                          <div className="mt-1 text-[10px] text-muted">
                            OS: {machine.os || "-"} | Admin:{" "}
                            {machine.isAdmin || "-"}
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="break-all rounded-lg bg-bg-soft px-2 py-1 text-xs text-fg-muted">
                            {machine.sessionToken || "-"}
                          </code>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => editMachine(machine)}
                            >
                              Edit
                            </Button>
                            {st === "pending" ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 bg-green-600 text-xs hover:bg-green-700"
                                onClick={() => void approveMachine(machine)}
                              >
                                Approve
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => void regenerateToken(machine.id)}
                            >
                              New Token
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-600"
                              onClick={() => void blockMachine(machine)}
                            >
                              Terminate
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-700"
                              onClick={() => void deleteMachine(machine.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
