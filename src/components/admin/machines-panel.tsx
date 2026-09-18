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
  KeyRound,
  Copy,
  Trash2,
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
  approxLocation?: string | null;
};

type WhitelistPackage = {
  id: string;
  label: string;
  category: string;
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
  const [packages, setPackages] = useState<WhitelistPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  /** general = global whitelist page; otherwise a catalog product id */
  const [scope, setScope] = useState<string>("general");
  const [packageFilter, setPackageFilter] = useState("");
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
  const [formProductKey, setFormProductKey] = useState("general");
  const [saving, setSaving] = useState(false);

  const [genCategory, setGenCategory] = useState("sat");
  const [genNote, setGenNote] = useState("");
  const [genExpires, setGenExpires] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{
    authKey: string;
    category: string;
    id: string;
    expiresAt: string | null;
  } | null>(null);
  const [authKeyFilter, setAuthKeyFilter] = useState<"active" | "all" | "revoked">(
    "active",
  );
  const [authKeys, setAuthKeys] = useState<
    Array<{
      id: string;
      category: string;
      authKey: string;
      keyName: string;
      note: string | null;
      expiresAt: string | null;
      createdAt?: string;
      source?: string | null;
      effectiveStatus?: string;
      status?: string;
      lastSeenAt?: string | null;
      hostname?: string | null;
    }>
  >([]);

  const loadMachines = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ packages: "1" });
      // General tab shows ALL rows (aggregate). Product tabs filter by package.
      if (scope && scope !== "general") {
        qs.set("productKey", scope);
      }
      const data = await fetchJson<
        Machine[] | { machines: Machine[]; packages?: WhitelistPackage[] }
      >(`/api/admin/whitelist/machines?${qs.toString()}`);
      if (Array.isArray(data)) {
        setMachines(data);
      } else {
        setMachines(Array.isArray(data.machines) ? data.machines : []);
        if (data.packages?.length) setPackages(data.packages);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load machines");
      setMachines([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  const loadAuthKeys = useCallback(async () => {
    try {
      const data = await fetchJson<{
        keys?: typeof authKeys;
      }>("/api/admin/whitelist/auth-keys");
      setAuthKeys(Array.isArray(data.keys) ? data.keys : []);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    void loadMachines();
    void loadAuthKeys();
    const t = setInterval(() => {
      void loadMachines();
      void loadAuthKeys();
    }, 15000);
    return () => clearInterval(t);
  }, [loadMachines, loadAuthKeys]);

  useEffect(() => {
    // Keep add form scoped to the active tab
    setFormProductKey(scope || "general");
  }, [scope]);

  async function generateAuthKey() {
    setGenBusy(true);
    try {
      const data = await fetchJson<{
        authKey: string;
        category: string;
        id: string;
        expiresAt: string | null;
      }>("/api/admin/whitelist/auth-keys", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          category: genCategory,
          note: genNote.trim() || undefined,
          expiresAt: genExpires.trim() || null,
        }),
      });
      setLastGenerated({
        authKey: data.authKey,
        category: data.category,
        id: data.id,
        expiresAt: data.expiresAt,
      });
      toast.success(`Auth key generated for ${data.category.toUpperCase()}`);
      await loadAuthKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenBusy(false);
    }
  }

  async function revokeAuthKey(id: string) {
    if (!confirm("Revoke this auth key? The app will no longer authorize with it.")) return;
    try {
      await fetchJson("/api/admin/whitelist/auth-keys", {
        method: "POST",
        body: JSON.stringify({ action: "revoke", id }),
      });
      toast.success("Key revoked");
      if (lastGenerated?.id === id) setLastGenerated(null);
      await loadAuthKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed");
    }
  }

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
    setFormProductKey(scope || "general");
  }

  function editMachine(machine: Machine) {
    setEditId(machine.id || "");
    setKeyName(machine.keyName || "");
    setMachineInput("");
    setRawSerial(machine.rawSerialNote || "");
    setHostname(machine.hostname || "");
    setStatus(machine.status || "active");
    setNote(machine.note || "");
    setFormProductKey(machine.productKey || "general");
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
          productKey: formProductKey || "general",
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
          productKey: machine.productKey || "general",
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
          productKey: machine.productKey || "general",
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
            <strong>General</strong> holds serial-number keys that authorize{" "}
            <em>any</em> software category. Software tabs are category-level
            only (SAT / ACT / GRE / GMAT / Proctor) — Standard/Pro/Premium share
            the same exam whitelist. Research & non-software items are excluded.
            Stripe activations land on the purchase&apos;s software category as{" "}
            <strong>active</strong>.
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

      <Card className="border-primary/30 bg-primary-soft/25">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Active auth codes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-fg-muted">
            Purchase (Stripe) and admin-generated auth codes the ExamHub app
            uses to authorize — no buyer serial. Filter defaults to{" "}
            <strong>active</strong>. Generate a code below without a Stripe
            purchase when needed.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Active auth codes
            </p>
            {(["active", "all", "revoked"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setAuthKeyFilter(f)}
                className={
                  authKeyFilter === f
                    ? "rounded-md border border-primary bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase text-primary"
                    : "rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted"
                }
              >
                {f}
              </button>
            ))}
            <span className="text-[10px] text-muted">
              {
                authKeys.filter((k) => (k.effectiveStatus || k.status) === "active")
                  .length
              }{" "}
              active · {authKeys.length} total
            </span>
          </div>

          {authKeys.filter((k) => {
            const eff = k.effectiveStatus || k.status || "unknown";
            if (authKeyFilter === "active") return eff === "active";
            if (authKeyFilter === "revoked")
              return eff === "revoked" || eff === "blocked" || eff === "expired";
            return true;
          }).length > 0 ? (
            <div className="space-y-2">
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {authKeys
                  .filter((k) => {
                    const eff = k.effectiveStatus || k.status || "unknown";
                    if (authKeyFilter === "active") return eff === "active";
                    if (authKeyFilter === "revoked")
                      return (
                        eff === "revoked" ||
                        eff === "blocked" ||
                        eff === "expired"
                      );
                    return true;
                  })
                  .map((k) => {
                  const eff = k.effectiveStatus || k.status || "unknown";
                  return (
                  <div
                    key={k.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold uppercase text-primary">
                        {k.category}
                      </span>{" "}
                      <Badge
                        className={
                          eff === "active"
                            ? "border-green-300 bg-green-50 text-green-800"
                            : eff === "revoked" || eff === "blocked"
                              ? "border-red-300 bg-red-50 text-red-800"
                              : eff === "expired"
                                ? "border-amber-300 bg-amber-50 text-amber-900"
                                : "border-border bg-bg-soft text-fg-muted"
                        }
                      >
                        {eff}
                      </Badge>{" "}
                      <span className="text-muted">{k.source || "—"}</span>
                      {k.authKey ? (
                        <code className="ml-1 break-all font-mono text-[10px] text-fg-muted">
                          {k.authKey.slice(0, 12)}…
                        </code>
                      ) : (
                        <span className="ml-1 text-muted">(revoked)</span>
                      )}
                      {k.note ? (
                        <span className="ml-1 text-muted">· {k.note}</span>
                      ) : null}
                      <div className="text-[10px] text-muted">
                        {k.createdAt
                          ? `Created ${new Date(k.createdAt).toLocaleString()}`
                          : null}
                        {k.expiresAt
                          ? ` · Expires ${new Date(k.expiresAt).toLocaleString()}`
                          : " · No expiry"}
                        {k.lastSeenAt
                          ? ` · Seen ${new Date(k.lastSeenAt).toLocaleString()}`
                          : null}
                        {k.hostname ? ` · ${k.hostname}` : null}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {k.authKey ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => {
                            void navigator.clipboard.writeText(k.authKey);
                            toast.success("Copied");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      ) : null}
                      {eff === "active" || eff === "pending" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-red-600"
                          onClick={() => void revokeAuthKey(k.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="border-t border-border/70 pt-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Generate auth code
            </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={genCategory}
                onChange={(e) => setGenCategory(e.target.value)}
              >
                {(["sat", "act", "gre", "gmat", "proctor"] as const).map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expiry (optional)</Label>
              <Input
                type="datetime-local"
                value={genExpires}
                onChange={(e) => setGenExpires(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={genBusy}
                onClick={() => void generateAuthKey()}
                className="w-full"
              >
                {genBusy ? "Generating…" : "Generate auth key"}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note / label (optional)</Label>
            <Input
              value={genNote}
              onChange={(e) => setGenNote(e.target.value)}
              placeholder="e.g. Support ticket #123 · replacement key"
            />
          </div>
          </div>

          {lastGenerated ? (
            <div className="space-y-2 rounded-xl border border-green-300 bg-green-50/80 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-green-900">
                New key · {lastGenerated.category.toUpperCase()} — copy now
              </p>
              <code className="block break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-fg">
                {lastGenerated.authKey}
              </code>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(lastGenerated.authKey);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
                {lastGenerated.expiresAt ? (
                  <span className="text-[11px] text-fg-muted">
                    Expires {new Date(lastGenerated.expiresAt).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-[11px] text-fg-muted">No expiry</span>
                )}
              </div>
            </div>
          ) : null}


        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Whitelist category
            </p>
            <Input
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              placeholder="Filter packages…"
              className="h-8 max-w-xs text-xs"
            />
          </div>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {(packages.length
              ? packages
              : [{ id: "general", label: "General (global)", category: "general" }]
            )
              .filter((p) => {
                const q = packageFilter.trim().toLowerCase();
                if (!q) return true;
                return (
                  p.id.toLowerCase().includes(q) ||
                  p.label.toLowerCase().includes(q) ||
                  p.category.toLowerCase().includes(q)
                );
              })
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setScope(p.id)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                    scope === p.id
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-fg-muted hover:border-primary/40",
                  )}
                  title={p.id}
                >
                  {p.id === "general" ? "General" : p.label}
                </button>
              ))}
          </div>
          <p className="text-[11px] text-muted">
            Active category:{" "}
            <code className="font-mono text-fg">{scope}</code>
            {scope === "general"
              ? " · showing all machines (aggregate view)"
              : " · showing this software category only"}
          </p>
        </CardContent>
      </Card>

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
              <div className="space-y-1.5">
                <Label htmlFor="formProductKey">Whitelist category</Label>
                <Select
                  id="formProductKey"
                  value={formProductKey}
                  onChange={(e) => setFormProductKey(e.target.value)}
                >
                  {(packages.length
                    ? packages
                    : [{ id: "general", label: "General (global)", category: "general" }]
                  ).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id === "general" ? "General (global)" : `${p.label} (${p.id})`}
                    </option>
                  ))}
                </Select>
                <p className="text-[10px] text-muted">
                  Serial is authorized for this software category (General
                  authorizes every software category).
                </p>
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
