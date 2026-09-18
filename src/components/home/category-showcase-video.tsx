import { useEffect, useMemo, useRef, useState } from "react";
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
let cacheBust = 0;

/** Call after admin saves so the homepage refetch picks up new videos. */
export function invalidateShowcaseVideoCache() {
  cache = null;
  cachePromise = null;
  cacheBust += 1;
}

async function loadVideos(): Promise<PublicVideo[]> {
  if (cache) return cache;
  if (!cachePromise) {
    const bust = cacheBust;
    cachePromise = fetch(`/api/showcase-videos?t=${bust}`)
      .then((r) => r.json())
      .then((d) => {
        cache = Array.isArray(d?.videos) ? d.videos : [];
        return cache!;
      })
      .catch(() => {
        cache = [];
        return cache!;
      })
      .finally(() => {
        cachePromise = null;
      });
  }
  return cachePromise;
}

/**
 * Live showcase player for a homepage category section.
 * Hidden when no video is configured. Uploaded files play via
 * `/api/showcase-videos/file/:category` (muted autoplay + controls).
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

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

  // When the player scrolls into view, kick muted autoplay (browser-safe)
  useEffect(() => {
    if (playback.kind !== "video" || !playback.src) return;
    const el = videoRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;

    const tryPlay = () => {
      el.muted = true;
      el.defaultMuted = true;
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          /* autoplay blocked until gesture — controls still available */
        });
      }
    };

    tryPlay();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) tryPlay();
          else el.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [playback.kind, playback.src]);

  if (!ready || playback.kind === "none") return null;

  return (
    <div
      ref={wrapRef}
      className={
        className ||
        "comic-panel mb-5 overflow-hidden bg-surface"
      }
    >
      <div className="relative aspect-video w-full bg-[#1a120c]">
        <span className="comic-sticker absolute left-3 top-3 z-10" aria-hidden>
          LIVE
        </span>
        {playback.kind === "youtube" || playback.kind === "vimeo" ? (
          <iframe
            title={video?.label || `${category} showcase`}
            src={playback.embedSrc || undefined}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="eager"
          />
        ) : playback.src ? (
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            src={playback.src}
            autoPlay
            muted
            playsInline
            controls
            loop
            preload="auto"
          />
        ) : null}
      </div>
      {video?.label ? (
        <p className="border-t-2 border-[#2c1a0e]/25 bg-accent-soft/40 px-3 py-2 text-xs font-semibold text-fg">
          {video.label}
        </p>
      ) : null}
    </div>
  );
}
