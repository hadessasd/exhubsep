/** Client-safe playback URL helpers for category showcase videos. */

export function parseShowcasePlayback(input: {
  externalUrl?: string | null;
  filePath?: string | null;
  hasFileBlob?: boolean;
}): {
  kind: "youtube" | "vimeo" | "video" | "none";
  src: string | null;
  embedSrc: string | null;
} {
  const fileSrc =
    input.hasFileBlob && input.filePath ? input.filePath : null;
  const url = (input.externalUrl || "").trim();

  if (url) {
    const yt =
      url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
      ) || url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
    if (yt?.[1] || url.includes("youtube.com/embed/")) {
      const id =
        yt?.[1] ||
        url.split("/embed/")[1]?.split(/[?&]/)[0] ||
        "";
      if (id) {
        return {
          kind: "youtube",
          src: url,
          embedSrc: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0`,
        };
      }
    }
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm?.[1]) {
      return {
        kind: "vimeo",
        src: url,
        embedSrc: `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1`,
      };
    }
    return { kind: "video", src: url, embedSrc: null };
  }

  if (fileSrc) {
    return { kind: "video", src: fileSrc, embedSrc: null };
  }

  return { kind: "none", src: null, embedSrc: null };
}
