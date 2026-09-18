import { useEffect, useMemo, useRef, useState } from "react";
import { parseShowcasePlayback } from "@/lib/showcase-playback";
import { cn } from "@/lib/utils";

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
 * Uses object-fit: contain (letterbox, no crop). Hidden when unset.
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
          /* autoplay blocked until gesture */
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
      data-showcase=""
      className={cn(
        "category-video-frame overflow-hidden rounded-xl border-2 border-border-strong bg-[#140e0a]",
        className,
      )}
    >
      {/* Fixed 16:9 frame; media uses object-contain so uploads aren’t cropped */}
      <div className="relative flex aspect-video w-full items-center justify-center bg-[#140e0a]">
        <span
          className="comic-sticker absolute left-2 top-2 z-10 sm:left-3 sm:top-3"
          aria-hidden
        >
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
        <p className="border-t-2 border-border-strong/25 bg-accent-soft/60 px-3 py-2 text-xs font-bold text-fg">
          {video.label}
        </p>
      ) : null}
    </div>
  );
}
