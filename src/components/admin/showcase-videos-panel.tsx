import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Film, RefreshCw, Trash2, Upload } from "lucide-react";

type VideoRow = {
  id: string;
  category: string;
  label: string | null;
  externalUrl: string | null;
  fileName: string | null;
  fileMime: string | null;
  hasFileBlob: boolean;
  filePath: string | null;
};

const LABELS: Record<string, string> = {
  sat: "SAT",
  act: "ACT",
  gre: "GRE",
  gmat: "GMAT",
  proctor: "Proctor",
};

export function ShowcaseVideosPanel() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [categories, setCategories] = useState<string[]>([
    "sat",
    "act",
    "gre",
    "gmat",
    "proctor",
  ]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("sat");
  const [label, setLabel] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [clearBlob, setClearBlob] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/showcase-videos", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setVideos(data.videos || []);
      if (Array.isArray(data.categories) && data.categories.length) {
        setCategories(data.categories);
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

  useEffect(() => {
    const row = videos.find((v) => v.category === active);
    setLabel(row?.label || "");
    setExternalUrl(row?.externalUrl || "");
    setFileName(row?.fileName || null);
    setFileMime(row?.fileMime || null);
    setFileData(null);
    setClearBlob(false);
  }, [active, videos]);

  const current = videos.find((v) => v.category === active);

  async function onFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|webm|mov|m4v)$/i)) {
      toast.error("Choose a video file (mp4/webm/mov)");
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      toast.error("Max ~40MB — use an external URL for larger videos");
      return;
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    const b64 = btoa(binary);
    setFileData(b64);
    setFileName(file.name);
    setFileMime(file.type || "video/mp4");
    setClearBlob(false);
    toast.success(`Ready to upload: ${file.name}`);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/showcase-videos", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save",
          category: active,
          label: label.trim() || null,
          externalUrl: externalUrl.trim() || null,
          fileName: fileData ? fileName : undefined,
          fileMime: fileData ? fileMime : undefined,
          fileData: fileData || undefined,
          clearFileBlob: clearBlob,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      toast.success(`Saved ${LABELS[active] || active} showcase video`);
      setFileData(null);
      setClearBlob(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function clearAll() {
    if (!confirm(`Remove showcase video for ${LABELS[active] || active}?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/showcase-videos", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clear", category: active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Clear failed");
      toast.success("Cleared");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-primary/25">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Film className="h-4 w-4 text-primary" />
            Homepage showcase videos
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-fg-muted">
          Attach a video beside each homepage category (SAT / ACT / GRE / GMAT /
          Proctor). Paste a YouTube, Vimeo, or direct mp4 URL, and/or upload a
          file. Plays muted with autoplay on the public homepage when set.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const row = videos.find((v) => v.category === c);
            const has =
              Boolean(row?.externalUrl) || Boolean(row?.hasFileBlob);
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={
                  active === c
                    ? "rounded-lg border border-primary bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase text-primary"
                    : "rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold uppercase text-fg-muted hover:border-primary/40"
                }
              >
                {LABELS[c] || c}
                {has ? (
                  <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                ) : null}
              </button>
            );
          })}
        </div>

        <form onSubmit={(e) => void save(e)} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Label (optional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. SAT Pro walkthrough"
              />
            </div>
            <div className="space-y-1.5">
              <Label>External video URL</Label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=… or .mp4"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium hover:border-primary/40">
              <Upload className="h-4 w-4 text-primary" />
              Upload video file
              <input
                type="file"
                accept="video/*,.mp4,.webm,.mov,.m4v"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] || null)}
              />
            </label>
            {fileData ? (
              <Badge className="border-green-300 bg-green-50 text-green-800">
                New file ready: {fileName}
              </Badge>
            ) : current?.hasFileBlob ? (
              <Badge className="border-border bg-bg-soft text-fg-muted">
                Stored file: {current.fileName || "video"}
              </Badge>
            ) : (
              <span className="text-xs text-muted">No uploaded file</span>
            )}
            {current?.hasFileBlob || fileData ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-red-600"
                onClick={() => {
                  setClearBlob(true);
                  setFileData(null);
                  setFileName(null);
                  toast.message("File will be cleared on save");
                }}
              >
                Remove file
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : `Save ${LABELS[active] || active}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void clearAll()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear category
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
