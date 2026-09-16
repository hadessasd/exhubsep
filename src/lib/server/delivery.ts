/**
 * Service projects (research/internship progress) + delivery assets (bypass files / proctor steps).
 */
import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { ensureStripeTables } from "@/lib/server/stripe-payments";

function uid(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

export type ServiceProject = {
  id: string;
  publicToken: string;
  kind: string;
  stripeSessionId: string | null;
  contactMethod: string | null;
  contactValue: string | null;
  progress: number;
  deliveryUrl: string | null;
  status: string;
  title: string | null;
  notes: string | null;
  adminMessage: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DeliveryAsset = {
  id: string;
  scopeKey: string;
  label: string;
  category: string | null;
  tier: string | null;
  os: string | null;
  /** External download URL (Dropbox, Drive, CDN, etc.) */
  fileUrl: string | null;
  /** Alias persisted column for external link (mirrors fileUrl when set). */
  externalUrl: string | null;
  message: string | null;
  steps: string | null;
  /** Buyer-facing notes / instructions (admin editable). */
  instructions: string | null;
  fileName: string | null;
  fileMime: string | null;
  /** True when an uploaded blob is stored server-side. */
  hasFileBlob: boolean;
  updatedAt?: string;
};

function rowProject(r: Record<string, unknown>): ServiceProject {
  return {
    id: String(r.id),
    publicToken: String(r.public_token),
    kind: String(r.kind),
    stripeSessionId: (r.stripe_session_id as string) ?? null,
    contactMethod: (r.contact_method as string) ?? null,
    contactValue: (r.contact_value as string) ?? null,
    progress: Number(r.progress ?? 0),
    deliveryUrl: (r.delivery_url as string) ?? null,
    status: String(r.status ?? "in_progress"),
    title: (r.title as string) ?? null,
    notes: (r.notes as string) ?? null,
    adminMessage: (r.admin_message as string) ?? null,
    createdAt: r.created_at
      ? new Date(r.created_at as string).toISOString()
      : undefined,
    updatedAt: r.updated_at
      ? new Date(r.updated_at as string).toISOString()
      : undefined,
  };
}

function rowAsset(r: Record<string, unknown>): DeliveryAsset {
  const external =
    ((r.external_url as string) ?? null) ||
    ((r.file_url as string) ?? null) ||
    null;
  return {
    id: String(r.id),
    scopeKey: String(r.scope_key),
    label: String(r.label),
    category: (r.category as string) ?? null,
    tier: (r.tier as string) ?? null,
    os: (r.os as string) ?? null,
    fileUrl: external,
    externalUrl: (r.external_url as string) ?? null,
    message: (r.message as string) ?? null,
    steps: (r.steps as string) ?? null,
    instructions: (r.instructions as string) ?? null,
    fileName: (r.file_name as string) ?? null,
    fileMime: (r.file_mime as string) ?? null,
    hasFileBlob: Boolean(r.file_data),
    updatedAt: r.updated_at
      ? new Date(r.updated_at as string).toISOString()
      : undefined,
  };
}

export async function createServiceProject(input: {
  kind: "research" | "internship";
  stripeSessionId?: string | null;
  contactMethod: string;
  contactValue: string;
  title?: string;
  notes?: string;
}): Promise<ServiceProject> {
  await ensureStripeTables();
  const sql = await getSql();
  const id = uid("prj");
  const token = randomBytes(16).toString("hex");
  await sql`
    INSERT INTO service_projects (
      id, public_token, kind, stripe_session_id,
      contact_method, contact_value, progress, status, title, notes
    ) VALUES (
      ${id}, ${token}, ${input.kind}, ${input.stripeSessionId ?? null},
      ${input.contactMethod.trim()}, ${input.contactValue.trim()},
      0, 'in_progress',
      ${input.title?.trim() || `${input.kind} project`},
      ${input.notes?.trim() || null}
    )
  `;
  const rows = (await sql`
    SELECT * FROM service_projects WHERE id = ${id} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rowProject(rows[0]!);
}

export async function getProjectByToken(
  token: string,
): Promise<ServiceProject | null> {
  await ensureStripeTables();
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM service_projects WHERE public_token = ${token} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows[0] ? rowProject(rows[0]) : null;
}

export async function getProjectBySession(
  sessionId: string,
): Promise<ServiceProject | null> {
  await ensureStripeTables();
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM service_projects WHERE stripe_session_id = ${sessionId} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows[0] ? rowProject(rows[0]) : null;
}

export async function listServiceProjects(): Promise<ServiceProject[]> {
  await ensureStripeTables();
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM service_projects ORDER BY created_at DESC LIMIT 500
  `) as Array<Record<string, unknown>>;
  return rows.map(rowProject);
}

export async function updateServiceProject(input: {
  id: string;
  progress?: number;
  deliveryUrl?: string | null;
  status?: string;
  adminMessage?: string | null;
  title?: string | null;
  notes?: string | null;
}): Promise<ServiceProject> {
  await ensureStripeTables();
  const sql = await getSql();
  const cur = (await sql`
    SELECT * FROM service_projects WHERE id = ${input.id} LIMIT 1
  `) as Array<Record<string, unknown>>;
  if (!cur[0]) throw new Error("Project not found");
  const p = rowProject(cur[0]);
  const progress =
    input.progress !== undefined
      ? Math.max(0, Math.min(100, Math.round(input.progress)))
      : p.progress;
  let status = input.status ?? p.status;
  if (progress >= 100 && status === "in_progress") status = "ready";
  await sql`
    UPDATE service_projects SET
      progress = ${progress},
      delivery_url = ${input.deliveryUrl !== undefined ? input.deliveryUrl : p.deliveryUrl},
      status = ${status},
      admin_message = ${input.adminMessage !== undefined ? input.adminMessage : p.adminMessage},
      title = ${input.title !== undefined ? input.title : p.title},
      notes = ${input.notes !== undefined ? input.notes : p.notes},
      updated_at = now()
    WHERE id = ${input.id}
  `;
  const rows = (await sql`
    SELECT * FROM service_projects WHERE id = ${input.id} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rowProject(rows[0]!);
}

export async function listDeliveryAssets(): Promise<DeliveryAsset[]> {
  await ensureStripeTables();
  await ensureDeliveryExtraColumns();
  const sql = await getSql();
  // Omit file_data blob from list queries (only flag presence)
  const rows = (await sql`
    SELECT id, scope_key, label, category, tier, os, file_url, external_url,
           message, steps, instructions, file_name, file_mime, updated_at,
           CASE WHEN file_data IS NOT NULL AND length(file_data) > 0 THEN '1' ELSE NULL END AS file_data
    FROM delivery_assets ORDER BY scope_key ASC
  `) as Array<Record<string, unknown>>;
  return rows.map(rowAsset);
}

async function ensureDeliveryExtraColumns(): Promise<void> {
  const sql = await getSql();
  for (const col of [
    `ALTER TABLE delivery_assets ADD COLUMN IF NOT EXISTS file_name TEXT`,
    `ALTER TABLE delivery_assets ADD COLUMN IF NOT EXISTS file_mime TEXT`,
    `ALTER TABLE delivery_assets ADD COLUMN IF NOT EXISTS file_data TEXT`,
    `ALTER TABLE delivery_assets ADD COLUMN IF NOT EXISTS instructions TEXT`,
    `ALTER TABLE delivery_assets ADD COLUMN IF NOT EXISTS external_url TEXT`,
  ]) {
    try {
      await sql.query(col);
    } catch {
      try {
        await sql.query(col.replace(" IF NOT EXISTS", ""));
      } catch {
        /* exists */
      }
    }
  }
}

export async function upsertDeliveryAsset(input: {
  scopeKey: string;
  label: string;
  category?: string | null;
  tier?: string | null;
  os?: string | null;
  fileUrl?: string | null;
  externalUrl?: string | null;
  message?: string | null;
  steps?: string | null;
  instructions?: string | null;
  fileName?: string | null;
  fileMime?: string | null;
  /** Base64 (optionally data-URL) app file upload — stored server-side only. */
  fileData?: string | null;
  clearFileBlob?: boolean;
}): Promise<DeliveryAsset> {
  await ensureStripeTables();
  await ensureDeliveryExtraColumns();
  const sql = await getSql();
  const scope = input.scopeKey.trim().toLowerCase();
  const external =
    (input.externalUrl?.trim() || input.fileUrl?.trim() || null) ?? null;
  const existing = (await sql`
    SELECT id FROM delivery_assets WHERE scope_key = ${scope} LIMIT 1
  `) as Array<{ id: string }>;

  let fileData: string | null | undefined = undefined;
  if (input.clearFileBlob) {
    fileData = null;
  } else if (input.fileData !== undefined) {
    // Strip data-URL prefix if present; cap ~40MB base64 (~30MB binary)
    let raw = input.fileData?.trim() || null;
    if (raw?.startsWith("data:")) {
      const idx = raw.indexOf("base64,");
      raw = idx >= 0 ? raw.slice(idx + 7) : raw;
    }
    if (raw && raw.length > 55_000_000) {
      throw new Error("Uploaded file too large (max ~40MB). Use an external download link instead.");
    }
    fileData = raw;
  }

  if (existing[0]?.id) {
    if (fileData !== undefined) {
      await sql`
        UPDATE delivery_assets SET
          label = ${input.label.trim()},
          category = ${input.category ?? null},
          tier = ${input.tier ?? null},
          os = ${input.os ?? null},
          file_url = ${external},
          external_url = ${external},
          message = ${input.message ?? null},
          steps = ${input.steps ?? null},
          instructions = ${input.instructions ?? null},
          file_name = ${input.fileName ?? null},
          file_mime = ${input.fileMime ?? null},
          file_data = ${fileData},
          updated_at = now()
        WHERE id = ${existing[0].id}
      `;
    } else {
      await sql`
        UPDATE delivery_assets SET
          label = ${input.label.trim()},
          category = ${input.category ?? null},
          tier = ${input.tier ?? null},
          os = ${input.os ?? null},
          file_url = ${external},
          external_url = ${external},
          message = ${input.message ?? null},
          steps = ${input.steps ?? null},
          instructions = ${input.instructions ?? null},
          file_name = COALESCE(${input.fileName ?? null}, file_name),
          file_mime = COALESCE(${input.fileMime ?? null}, file_mime),
          updated_at = now()
        WHERE id = ${existing[0].id}
      `;
    }
    const rows = (await sql`
      SELECT * FROM delivery_assets WHERE id = ${existing[0].id} LIMIT 1
    `) as Array<Record<string, unknown>>;
    return rowAsset(rows[0]!);
  }

  const id = uid("del");
  await sql`
    INSERT INTO delivery_assets (
      id, scope_key, label, category, tier, os, file_url, external_url,
      message, steps, instructions, file_name, file_mime, file_data
    ) VALUES (
      ${id}, ${scope}, ${input.label.trim()},
      ${input.category ?? null}, ${input.tier ?? null}, ${input.os ?? null},
      ${external}, ${external},
      ${input.message ?? null}, ${input.steps ?? null}, ${input.instructions ?? null},
      ${input.fileName ?? null}, ${input.fileMime ?? null}, ${fileData ?? null}
    )
  `;
  const rows = (await sql`
    SELECT * FROM delivery_assets WHERE id = ${id} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rowAsset(rows[0]!);
}

export async function getDeliveryAssetById(
  id: string,
): Promise<(DeliveryAsset & { fileData: string | null }) | null> {
  await ensureStripeTables();
  await ensureDeliveryExtraColumns();
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM delivery_assets WHERE id = ${id} LIMIT 1
  `) as Array<Record<string, unknown>>;
  if (!rows[0]) return null;
  const base = rowAsset(rows[0]);
  return {
    ...base,
    fileData: (rows[0].file_data as string) ?? null,
  };
}

export async function deleteDeliveryAsset(id: string): Promise<void> {
  await ensureStripeTables();
  const sql = await getSql();
  await sql`DELETE FROM delivery_assets WHERE id = ${id}`;
}

/**
 * Resolve best delivery asset for a purchase.
 * Priority: exact exam-tier-os → exam-all-os → proctor product → proctor-universal
 */
export async function resolveDeliveryAssets(opts: {
  productKey: string;
  exam?: string | null;
  tier?: string | null;
  os?: string | null;
  kind?: string;
}): Promise<DeliveryAsset[]> {
  const all = await listDeliveryAssets();
  if (!all.length) return [];

  const exam = (opts.exam || "").toLowerCase();
  const tier = (opts.tier || "").toLowerCase();
  const os = (opts.os || "").toLowerCase();
  const key = opts.productKey.toLowerCase();

  const scored = all
    .map((a) => {
      const sk = a.scopeKey.toLowerCase();
      let score = 0;
      if (sk === `${exam}-${tier}-${os}`) score = 100;
      else if (sk === `${exam}-all-${os}`) score = 90;
      else if (sk === `${exam}-${tier}-all`) score = 85;
      else if (sk === `${exam}-all-all`) score = 80;
      else if (sk === `proctor-${key}` || sk === key) score = 70;
      else if (sk === "proctor-universal" || sk === "universal") score = 50;
      else if (os && sk.endsWith(`-${os}`) && sk.includes(exam || "x")) score = 40;
      else score = 0;
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    // fallback: any proctor-universal
    return all.filter((a) =>
      ["proctor-universal", "universal"].includes(a.scopeKey.toLowerCase()),
    );
  }
  // return top match + universal if different
  const top = scored[0]!.a;
  const uni = all.find((a) => a.scopeKey.toLowerCase() === "proctor-universal");
  if (uni && uni.id !== top.id && (opts.kind === "proctor" || !exam)) {
    return [top, uni];
  }
  return [top];
}

/** Suggested scope keys for admin UI */
export const DELIVERY_SCOPE_PRESETS = [
  { scopeKey: "sat-standard-macos", label: "SAT Standard · macOS" },
  { scopeKey: "sat-standard-windows", label: "SAT Standard · Windows" },
  { scopeKey: "sat-pro-macos", label: "SAT Pro · macOS" },
  { scopeKey: "sat-pro-windows", label: "SAT Pro · Windows" },
  { scopeKey: "sat-premium-macos", label: "SAT Premium · macOS" },
  { scopeKey: "sat-premium-windows", label: "SAT Premium · Windows" },
  { scopeKey: "sat-all-macos", label: "All SAT · macOS (universal file)" },
  { scopeKey: "sat-all-windows", label: "All SAT · Windows (universal file)" },
  { scopeKey: "act-standard-macos", label: "ACT Standard · macOS" },
  { scopeKey: "act-standard-windows", label: "ACT Standard · Windows" },
  { scopeKey: "act-pro-macos", label: "ACT Pro · macOS" },
  { scopeKey: "act-pro-windows", label: "ACT Pro · Windows" },
  { scopeKey: "act-premium-macos", label: "ACT Premium · macOS" },
  { scopeKey: "act-premium-windows", label: "ACT Premium · Windows" },
  { scopeKey: "act-all-macos", label: "All ACT · macOS (universal file)" },
  { scopeKey: "act-all-windows", label: "All ACT · Windows (universal file)" },
  { scopeKey: "gmat-standard-macos", label: "GMAT Standard · macOS" },
  { scopeKey: "gmat-standard-windows", label: "GMAT Standard · Windows" },
  { scopeKey: "gmat-pro-macos", label: "GMAT Pro · macOS" },
  { scopeKey: "gmat-pro-windows", label: "GMAT Pro · Windows" },
  { scopeKey: "gmat-premium-macos", label: "GMAT Premium · macOS" },
  { scopeKey: "gmat-premium-windows", label: "GMAT Premium · Windows" },
  { scopeKey: "gmat-all-macos", label: "All GMAT · macOS" },
  { scopeKey: "gmat-all-windows", label: "All GMAT · Windows" },
  { scopeKey: "gre-standard-macos", label: "GRE Standard · macOS" },
  { scopeKey: "gre-standard-windows", label: "GRE Standard · Windows" },
  { scopeKey: "gre-pro-macos", label: "GRE Pro · macOS" },
  { scopeKey: "gre-pro-windows", label: "GRE Pro · Windows" },
  { scopeKey: "gre-premium-macos", label: "GRE Premium · macOS" },
  { scopeKey: "gre-premium-windows", label: "GRE Premium · Windows" },
  { scopeKey: "gre-all-macos", label: "All GRE · macOS" },
  { scopeKey: "gre-all-windows", label: "All GRE · Windows" },
  { scopeKey: "proctor-universal", label: "All proctor tools · steps/file" },
] as const;

/** Public download path for an uploaded delivery blob (no secrets). */
export function deliveryDownloadPath(assetId: string): string {
  return `/api/delivery/file/${assetId}`;
}
