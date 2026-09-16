/**
 * Homepage per-category showcase videos (file upload and/or external URL).
 */
import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";

export const SHOWCASE_CATEGORIES = [
  "sat",
  "act",
  "gre",
  "gmat",
  "proctor",
] as const;

export type ShowcaseCategory = (typeof SHOWCASE_CATEGORIES)[number];

export type ShowcaseVideo = {
  id: string;
  category: string;
  label: string | null;
  /** External YouTube / Vimeo / direct mp4 URL */
  externalUrl: string | null;
  fileName: string | null;
  fileMime: string | null;
  hasFileBlob: boolean;
  /** Public playback URL when a blob is stored */
  filePath: string | null;
  updatedAt?: string;
};

function uid() {
  return `scv_${randomBytes(10).toString("hex")}`;
}

function normalizeCategory(raw: string): ShowcaseCategory {
  const c = raw.trim().toLowerCase();
  const map: Record<string, ShowcaseCategory> = {
    sat: "sat",
    act: "act",
    gre: "gre",
    gmat: "gmat",
    proctor: "proctor",
    proctoring: "proctor",
  };
  const out = map[c];
  if (!out) {
    throw new Error(
      "category must be sat, act, gre, gmat, or proctor",
    );
  }
  return out;
}

let ensured = false;

export async function ensureShowcaseVideoTable(): Promise<void> {
  if (ensured) return;
  const sql = await getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS category_showcase_videos (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      label TEXT,
      external_url TEXT,
      file_name TEXT,
      file_mime TEXT,
      file_data TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS category_showcase_videos_cat_idx ON category_showcase_videos (category)`;
  ensured = true;
}

function rowToVideo(r: Record<string, unknown>): ShowcaseVideo {
  const category = String(r.category);
  const hasBlob = Boolean(r.file_data);
  return {
    id: String(r.id),
    category,
    label: (r.label as string) ?? null,
    externalUrl: (r.external_url as string) ?? null,
    fileName: (r.file_name as string) ?? null,
    fileMime: (r.file_mime as string) ?? null,
    hasFileBlob: hasBlob,
    filePath: hasBlob ? `/api/showcase-videos/file/${category}` : null,
    updatedAt: r.updated_at
      ? new Date(r.updated_at as string).toISOString()
      : undefined,
  };
}

/** Public list — only categories that have a playable source. */
export async function listPublicShowcaseVideos(): Promise<ShowcaseVideo[]> {
  await ensureShowcaseVideoTable();
  const sql = await getSql();
  const rows = (await sql`
    SELECT
      id, category, label, external_url, file_name, file_mime, updated_at,
      CASE WHEN file_data IS NOT NULL AND length(file_data) > 0 THEN '1' ELSE NULL END AS file_data
    FROM category_showcase_videos
    WHERE
      (external_url IS NOT NULL AND length(trim(external_url)) > 0)
      OR (file_data IS NOT NULL AND length(file_data) > 0)
    ORDER BY category ASC
  `) as Array<Record<string, unknown>>;
  return rows.map(rowToVideo);
}

export async function listAdminShowcaseVideos(): Promise<ShowcaseVideo[]> {
  await ensureShowcaseVideoTable();
  const sql = await getSql();
  const rows = (await sql`
    SELECT
      id, category, label, external_url, file_name, file_mime, updated_at,
      CASE WHEN file_data IS NOT NULL AND length(file_data) > 0 THEN '1' ELSE NULL END AS file_data
    FROM category_showcase_videos
    ORDER BY category ASC
  `) as Array<Record<string, unknown>>;
  // Ensure all categories appear in admin UI (empty stubs)
  const byCat = new Map(rows.map((r) => [String(r.category), rowToVideo(r)]));
  return SHOWCASE_CATEGORIES.map((c) => {
    const existing = byCat.get(c);
    if (existing) return existing;
    return {
      id: "",
      category: c,
      label: null,
      externalUrl: null,
      fileName: null,
      fileMime: null,
      hasFileBlob: false,
      filePath: null,
    };
  });
}

export async function upsertShowcaseVideo(input: {
  category: string;
  label?: string | null;
  externalUrl?: string | null;
  fileName?: string | null;
  fileMime?: string | null;
  fileData?: string | null;
  clearFileBlob?: boolean;
}): Promise<ShowcaseVideo> {
  await ensureShowcaseVideoTable();
  const sql = await getSql();
  const category = normalizeCategory(input.category);

  const existing = (await sql`
    SELECT * FROM category_showcase_videos WHERE category = ${category} LIMIT 1
  `) as Array<Record<string, unknown>>;
  const prev = existing[0];

  let externalUrl: string | null =
    input.externalUrl !== undefined
      ? input.externalUrl?.trim() || null
      : ((prev?.external_url as string) ?? null);

  let label: string | null =
    input.label !== undefined
      ? input.label?.trim() || null
      : ((prev?.label as string) ?? null);

  let fileData: string | null = (prev?.file_data as string) ?? null;
  let fileName: string | null = (prev?.file_name as string) ?? null;
  let fileMime: string | null = (prev?.file_mime as string) ?? null;

  if (input.clearFileBlob) {
    fileData = null;
    fileName = null;
    fileMime = null;
  } else if (input.fileData !== undefined && input.fileData !== null) {
    let raw = input.fileData.trim() || null;
    if (raw?.startsWith("data:")) {
      const idx = raw.indexOf("base64,");
      raw = idx >= 0 ? raw.slice(idx + 7) : raw;
    }
    if (raw && raw.length > 55_000_000) {
      throw new Error(
        "Uploaded video too large (max ~40MB). Use a YouTube/Vimeo/direct URL instead.",
      );
    }
    fileData = raw;
    fileName = input.fileName ?? fileName;
    fileMime = input.fileMime ?? fileMime;
  }

  if (prev?.id) {
    await sql`
      UPDATE category_showcase_videos SET
        label = ${label},
        external_url = ${externalUrl},
        file_name = ${fileName},
        file_mime = ${fileMime},
        file_data = ${fileData},
        updated_at = now()
      WHERE id = ${String(prev.id)}
    `;
  } else {
    const id = uid();
    await sql`
      INSERT INTO category_showcase_videos (
        id, category, label, external_url, file_name, file_mime, file_data
      ) VALUES (
        ${id}, ${category}, ${label}, ${externalUrl},
        ${fileName}, ${fileMime}, ${fileData}
      )
    `;
  }

  const rows = (await sql`
    SELECT
      id, category, label, external_url, file_name, file_mime, updated_at,
      CASE WHEN file_data IS NOT NULL AND length(file_data) > 0 THEN '1' ELSE NULL END AS file_data
    FROM category_showcase_videos WHERE category = ${category} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rowToVideo(rows[0]!);
}

export async function clearShowcaseVideo(categoryRaw: string): Promise<void> {
  await ensureShowcaseVideoTable();
  const category = normalizeCategory(categoryRaw);
  const sql = await getSql();
  await sql`DELETE FROM category_showcase_videos WHERE category = ${category}`;
}

export async function getShowcaseVideoBlob(
  categoryRaw: string,
): Promise<{ fileData: string; fileMime: string | null; fileName: string | null } | null> {
  await ensureShowcaseVideoTable();
  const category = normalizeCategory(categoryRaw);
  const sql = await getSql();
  const rows = (await sql`
    SELECT file_data, file_mime, file_name FROM category_showcase_videos
    WHERE category = ${category} LIMIT 1
  `) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row?.file_data) return null;
  return {
    fileData: String(row.file_data),
    fileMime: (row.file_mime as string) ?? null,
    fileName: (row.file_name as string) ?? null,
  };
}

export { parseShowcasePlayback } from "@/lib/showcase-playback";
