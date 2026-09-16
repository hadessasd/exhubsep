import { useEffect, useMemo, useState } from "react";
import { parseShowcasePlayback } from "@/lib/showcase-playback";

type PublicVideo = {
  category: string;
  label?: string | null;
  externalUrl?: string | null;
  filePath?: string | null;
  hasFileBlob?: boolean;
};

let cache: PublicVideo[] | null = null;
let cachePromise: Promise<PublicVideo[]> | null = null;

async function loadVideos(): Promise<PublicVideo[]> {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetch("/api/showcase-videos")
      .then((r) => r.json())
      .then((d) => {
        cache = Array.isArray(d?.videos) ? d.videos : [];
        return cache!;
      })
      .catch(() => {
        cache = [];
        return cache;
      });
  }
  return cachePromise;
}

/**
 * Renders a live showcase player beside a homepage category section.
 * Hidden when no video is configured for that category.
 */
export function CategoryShowcaseVideo({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const [videos, setVideos] = useState<PublicVideo[]>(cache || []);
  const [ready, setReady] = useState(Boolean(cache));

  useEffect(() => {
    let cancelled = false;
    void loadVideos().then((list) => {
      if (!cancelled) {
        setVideos(list);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const video = useMemo(
    () =>
      videos.find(
        (v) => v.category.toLowerCase() === category.toLowerCase(),
      ) || null,
    [videos, category],
  );

  const playback = useMemo(
    () =>
      video
        ? parseShowcasePlayback({
            externalUrl: video.externalUrl,
            filePath: video.filePath,
            hasFileBlob: video.hasFileBlob,
          })
        : { kind: "none" as const, src: null, embedSrc: null },
    [video],
  );

  if (!ready || playback.kind === "none") return null;

  return (
    <div
      className={
        className ||
        "mb-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      }
    >
      <div className="aspect-video w-full bg-black">
        {playback.kind === "youtube" || playback.kind === "vimeo" ? (
          <iframe
            title={video?.label || `${category} showcase`}
            src={playback.embedSrc || undefined}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : playback.src ? (
          <video
            className="h-full w-full object-contain"
            src={playback.src}
            autoPlay
            muted
            playsInline
            controls
            loop
            preload="metadata"
          />
        ) : null}
      </div>
      {video?.label ? (
        <p className="border-t border-border px-3 py-2 text-xs text-fg-muted">
          {video.label}
        </p>
      ) : null}
    </div>
  );
}
