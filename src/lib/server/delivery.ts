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
  fileUrl: string | null;
  message: string | null;
  steps: string | null;
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
  return {
    id: String(r.id),
    scopeKey: String(r.scope_key),
    label: String(r.label),
    category: (r.category as string) ?? null,
    tier: (r.tier as string) ?? null,
    os: (r.os as string) ?? null,
    fileUrl: (r.file_url as string) ?? null,
    message: (r.message as string) ?? null,
    steps: (r.steps as string) ?? null,
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
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM delivery_assets ORDER BY scope_key ASC
  `) as Array<Record<string, unknown>>;
  return rows.map(rowAsset);
}

export async function upsertDeliveryAsset(input: {
  scopeKey: string;
  label: string;
  category?: string | null;
  tier?: string | null;
  os?: string | null;
  fileUrl?: string | null;
  message?: string | null;
  steps?: string | null;
}): Promise<DeliveryAsset> {
  await ensureStripeTables();
  const sql = await getSql();
  const scope = input.scopeKey.trim().toLowerCase();
  const existing = (await sql`
    SELECT id FROM delivery_assets WHERE scope_key = ${scope} LIMIT 1
  `) as Array<{ id: string }>;

  if (existing[0]?.id) {
    await sql`
      UPDATE delivery_assets SET
        label = ${input.label.trim()},
        category = ${input.category ?? null},
        tier = ${input.tier ?? null},
        os = ${input.os ?? null},
        file_url = ${input.fileUrl ?? null},
        message = ${input.message ?? null},
        steps = ${input.steps ?? null},
        updated_at = now()
      WHERE id = ${existing[0].id}
    `;
    const rows = (await sql`
      SELECT * FROM delivery_assets WHERE id = ${existing[0].id} LIMIT 1
    `) as Array<Record<string, unknown>>;
    return rowAsset(rows[0]!);
  }

  const id = uid("del");
  await sql`
    INSERT INTO delivery_assets (
      id, scope_key, label, category, tier, os, file_url, message, steps
    ) VALUES (
      ${id}, ${scope}, ${input.label.trim()},
      ${input.category ?? null}, ${input.tier ?? null}, ${input.os ?? null},
      ${input.fileUrl ?? null}, ${input.message ?? null}, ${input.steps ?? null}
    )
  `;
  const rows = (await sql`
    SELECT * FROM delivery_assets WHERE id = ${id} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rowAsset(rows[0]!);
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
  { scopeKey: "proctor-universal", label: "All proctor tools · steps/file" },
] as const;
