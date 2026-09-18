/**
 * Machine whitelist / verification store.
 *
 * Clients send the raw serial. ExamHub canonicalizes it, hashes it with
 * SHA-256 server-side, and stores/compares only the digest.
 */
import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { isLockedAdminEmail } from "@/lib/admin-lock";
import {
  GENERAL_WHITELIST_KEY,
  listWhitelistPackages,
  resolveWhitelistProductKey,
  whitelistCategoryFromProductKey,
  SOFTWARE_WHITELIST_CATEGORIES,
} from "@/lib/data/catalog";

export {
  GENERAL_WHITELIST_KEY,
  listWhitelistPackages,
  resolveWhitelistProductKey,
  whitelistCategoryFromProductKey,
  SOFTWARE_WHITELIST_CATEGORIES,
};

/**
 * Normalize any product id / alias to a software whitelist category
 * (`general` | `sat` | `act` | `gre` | `gmat` | `proctor`).
 */
export function normalizeWhitelistProductKey(
  productKey: string | null | undefined,
): string {
  return whitelistCategoryFromProductKey(productKey);
}

export type MachineRow = {
  id: string;
  keyName: string;
  /** SHA-256 digest used for verification. Kept as serialNumber for API compatibility. */
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
  productKey: string | null;
  source: string | null;
  stripeSessionId: string | null;
  rawSerialNote: string | null;
  /** Client-provided approximate location (city / coords / free text). */
  approxLocation: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function uid(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

/** Canonicalize before hashing so client casing/whitespace do not matter. */
export function normalizeSerial(serial: string): string {
  return serial.trim().toUpperCase();
}

/** SHA-256 of the canonical serial. Raw serials are never required in storage. */
export function hashSerial(serial: string): string {
  return createHash("sha256").update(normalizeSerial(serial), "utf8").digest("hex");
}

export function newSessionToken(): string {
  return randomBytes(24).toString("hex");
}

/** Ensure table exists (covers live preview if migration glob lagged). */
let tableReady: Promise<void> | null = null;
async function ensureMachineTable(): Promise<void> {
  if (tableReady) return tableReady;
  tableReady = (async () => {
    const sql = await getSql();
    await sql.query(`
CREATE TABLE IF NOT EXISTS machine_whitelist (
  id TEXT PRIMARY KEY,
  key_name TEXT NOT NULL DEFAULT 'Unnamed Key',
  machine_id_hash TEXT,
  serial_number TEXT,
  hostname TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  session_token TEXT,
  last_seen_at TIMESTAMPTZ,
  last_ip TEXT,
  city TEXT,
  country TEXT,
  os TEXT,
  is_admin TEXT,
  product_key TEXT,
  source TEXT DEFAULT 'manual',
  stripe_session_id TEXT,
  raw_serial_note TEXT,
  approx_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
    // machine_id_hash is authoritative. Backfill any rows created by the
    // temporary plain-serial schema, then restore the unique hash index.
    try {
      await sql.query(`ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS serial_number TEXT`);
      await sql.query(`ALTER TABLE machine_whitelist ALTER COLUMN machine_id_hash DROP NOT NULL`);
      const legacyRows = await sql.query<{ id: string; serial_number: string | null; raw_serial_note: string | null }>(
        `SELECT id, serial_number, raw_serial_note FROM machine_whitelist WHERE machine_id_hash IS NULL`,
      );
      for (const row of legacyRows) {
        const raw = row.serial_number || row.raw_serial_note || "";
        if (!raw.trim()) continue;
        await sql.query(`UPDATE machine_whitelist SET machine_id_hash = $1 WHERE id = $2`, [hashSerial(raw), row.id]);
      }
      await sql.query(`DROP INDEX IF EXISTS machine_whitelist_serial_uidx`);
      await sql.query(`DROP INDEX IF EXISTS machine_whitelist_hash_uidx`);
      // Migrate legacy null product_key → general (global whitelist)
      await sql.query(
        `UPDATE machine_whitelist SET product_key = 'general' WHERE product_key IS NULL OR trim(product_key) = ''`,
      );
      // Remap legacy per-tier keys (sat-pro, act-standard, …) → category
      await sql.query(`
UPDATE machine_whitelist SET product_key = 'sat'
 WHERE product_key IN ('standard','pro','premium')
    OR product_key = 'sat'
    OR product_key LIKE 'sat-%'
    OR product_key LIKE 'sat_%'`);
      await sql.query(`
UPDATE machine_whitelist SET product_key = 'act'
 WHERE product_key = 'act' OR product_key LIKE 'act-%' OR product_key LIKE 'act_%'`);
      await sql.query(`
UPDATE machine_whitelist SET product_key = 'gre'
 WHERE product_key = 'gre' OR product_key LIKE 'gre-%' OR product_key LIKE 'gre_%'`);
      await sql.query(`
UPDATE machine_whitelist SET product_key = 'gmat'
 WHERE product_key = 'gmat' OR product_key LIKE 'gmat-%' OR product_key LIKE 'gmat_%'`);
      await sql.query(`
UPDATE machine_whitelist SET product_key = 'proctor'
 WHERE product_key = 'proctor' OR product_key = 'proctoring'
    OR product_key LIKE 'proctor%'
    OR product_key LIKE 'tool-%'
    OR product_key LIKE 'contest-%'
    OR product_key LIKE '%lockdown%'
    OR product_key LIKE '%honorlock%'
    OR product_key LIKE '%proctorio%'`);
      await sql.query(`
UPDATE machine_whitelist SET product_key = 'general'
 WHERE product_key LIKE 'bundle%'
    OR product_key = 'research' OR product_key LIKE 'research%'
    OR product_key = 'internship' OR product_key LIKE 'intern%'`);
      // Dedupe after remap (keep newest row per hash+category)
      await sql.query(`
DELETE FROM machine_whitelist a
 USING machine_whitelist b
 WHERE a.machine_id_hash IS NOT NULL
   AND a.machine_id_hash = b.machine_id_hash
   AND a.product_key = b.product_key
   AND a.created_at < b.created_at`);
      try {
        await sql.query(
          `ALTER TABLE machine_whitelist ALTER COLUMN product_key SET DEFAULT 'general'`,
        );
      } catch {
        /* ignore */
      }
      await sql.query(`
CREATE UNIQUE INDEX IF NOT EXISTS machine_whitelist_hash_product_uidx
  ON machine_whitelist (machine_id_hash, product_key)
  WHERE machine_id_hash IS NOT NULL`);
      await sql.query(
        `CREATE INDEX IF NOT EXISTS machine_whitelist_product_idx ON machine_whitelist (product_key)`,
      );
    } catch {
      // Older/preview databases may not support every ALTER in one pass.
    }
    await sql.query(
      `CREATE INDEX IF NOT EXISTS machine_whitelist_status_idx ON machine_whitelist (status)`,
    );
    await sql.query(
      `CREATE INDEX IF NOT EXISTS machine_whitelist_token_idx ON machine_whitelist (session_token)`,
    );
    for (const col of [
      `ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS product_key TEXT`,
      `ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'`,
      `ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`,
      `ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS raw_serial_note TEXT`,
      `ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS approx_location TEXT`,
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
  })().catch((err) => {
    tableReady = null;
    throw err;
  });
  return tableReady;
}

function rowToMachine(r: Record<string, unknown>): MachineRow {
  return {
    id: String(r.id),
    keyName: String(r.key_name ?? "Unnamed Key"),
    serialNumber: String(r.machine_id_hash ?? ""),
    hostname: (r.hostname as string) ?? null,
    note: (r.note as string) ?? null,
    status: String(r.status ?? "pending"),
    expiresAt: r.expires_at
      ? new Date(r.expires_at as string).toISOString()
      : null,
    sessionToken: (r.session_token as string) ?? null,
    lastSeenAt: r.last_seen_at
      ? new Date(r.last_seen_at as string).toISOString()
      : null,
    lastIp: (r.last_ip as string) ?? null,
    city: (r.city as string) ?? null,
    country: (r.country as string) ?? null,
    os: (r.os as string) ?? null,
    isAdmin: (r.is_admin as string) ?? null,
    productKey: normalizeWhitelistProductKey((r.product_key as string) ?? null),
    source: (r.source as string) ?? null,
    stripeSessionId: (r.stripe_session_id as string) ?? null,
    rawSerialNote: (r.raw_serial_note as string) ?? null,
    approxLocation: (r.approx_location as string) ?? null,
    createdAt: r.created_at
      ? new Date(r.created_at as string).toISOString()
      : undefined,
    updatedAt: r.updated_at
      ? new Date(r.updated_at as string).toISOString()
      : undefined,
  };
}

export async function requireAdminFromRequest(request: Request) {
  const { auth } = await import("@/lib/auth/server");
  const session = await auth.api.getSession({ headers: request.headers });
  const email = session?.user?.email ?? null;
  if (!session?.user || !isLockedAdminEmail(email)) {
    throw new Error("Forbidden");
  }
  return { id: session.user.id, email };
}

export async function listMachines(): Promise<MachineRow[]> {
  await ensureMachineTable();
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM machine_whitelist ORDER BY created_at DESC LIMIT 2000
  `) as Array<Record<string, unknown>>;
  return rows.map(rowToMachine);
}

export async function getMachineById(id: string): Promise<MachineRow | null> {
  await ensureMachineTable();
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM machine_whitelist WHERE id = ${id} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows[0] ? rowToMachine(rows[0]) : null;
}

export async function findMachineByInput(
  machineInput: string,
  productKey?: string | null,
): Promise<MachineRow | null> {
  await ensureMachineTable();
  const sql = await getSql();
  const serial = normalizeSerial(machineInput);
  if (!serial) return null;
  const digest = hashSerial(serial);
  const scope = normalizeWhitelistProductKey(productKey);
  const rows = (await sql`
    SELECT * FROM machine_whitelist
    WHERE machine_id_hash = ${digest}
      AND product_key = ${scope}
    LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows[0] ? rowToMachine(rows[0]) : null;
}

/** All whitelist rows for a serial across product packages. */
export async function findMachinesBySerial(
  machineInput: string,
): Promise<MachineRow[]> {
  await ensureMachineTable();
  const sql = await getSql();
  const serial = normalizeSerial(machineInput);
  if (!serial) return [];
  const digest = hashSerial(serial);
  const rows = (await sql`
    SELECT * FROM machine_whitelist
    WHERE machine_id_hash = ${digest}
    ORDER BY updated_at DESC
  `) as Array<Record<string, unknown>>;
  return rows.map(rowToMachine);
}

export async function listMachinesByProductKey(
  productKey: string,
): Promise<MachineRow[]> {
  await ensureMachineTable();
  const sql = await getSql();
  const scope = normalizeWhitelistProductKey(productKey);
  const rows = (await sql`
    SELECT * FROM machine_whitelist
    WHERE product_key = ${scope}
    ORDER BY created_at DESC
    LIMIT 2000
  `) as Array<Record<string, unknown>>;
  return rows.map(rowToMachine);
}

export async function listMachinesByStripeSession(
  sessionId: string,
): Promise<MachineRow[]> {
  await ensureMachineTable();
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM machine_whitelist
    WHERE stripe_session_id = ${sessionId}
    ORDER BY created_at DESC
  `) as Array<Record<string, unknown>>;
  return rows.map(rowToMachine);
}

export type UpsertMachineInput = {
  id?: string;
  keyName: string;
  machineInput?: string;
  hostname?: string;
  note?: string;
  status?: string;
  forever?: boolean;
  expiresAt?: string | null;
  lastIp?: string;
  city?: string;
  country?: string;
  os?: string;
  isAdmin?: string;
  productKey?: string | null;
  source?: string | null;
  stripeSessionId?: string | null;
  rawSerialNote?: string | null;
  approxLocation?: string | null;
};

export async function upsertMachine(
  input: UpsertMachineInput,
): Promise<MachineRow> {
  await ensureMachineTable();
  const sql = await getSql();
  const keyName = input.keyName.trim() || "Unnamed Key";
  const status = (input.status || "active").toLowerCase();
  const forever = input.forever !== false && !input.expiresAt;
  const expiresAt =
    forever || !input.expiresAt
      ? null
      : new Date(input.expiresAt).toISOString();

  if (input.id) {
    const existing = await getMachineById(input.id);
    if (!existing) throw new Error("Machine not found");

    let machineIdHash = existing.serialNumber;
    if (input.machineInput?.trim()) {
      machineIdHash = hashSerial(input.machineInput);
    }
    const scopeProduct =
      input.productKey !== undefined && input.productKey !== null
        ? normalizeWhitelistProductKey(input.productKey)
        : normalizeWhitelistProductKey(existing.productKey);

    await sql`
      UPDATE machine_whitelist SET
        key_name = ${keyName},
        machine_id_hash = ${machineIdHash},
        serial_number = NULL,
        hostname = ${input.hostname?.trim() || existing.hostname},
        note = ${input.note?.trim() ?? existing.note},
        status = ${status},
        expires_at = ${expiresAt},
        product_key = ${scopeProduct},
        source = COALESCE(${input.source ?? null}, source),
        stripe_session_id = COALESCE(${input.stripeSessionId ?? null}, stripe_session_id),
        raw_serial_note = COALESCE(${input.rawSerialNote ?? null}, raw_serial_note),
        os = COALESCE(${input.os ?? null}, os),
        is_admin = COALESCE(${input.isAdmin ?? null}, is_admin),
        last_ip = COALESCE(${input.lastIp ?? null}, last_ip),
        city = COALESCE(${input.city ?? null}, city),
        country = COALESCE(${input.country ?? null}, country),
        approx_location = COALESCE(${input.approxLocation ?? null}, approx_location),
        updated_at = now()
      WHERE id = ${input.id}
    `;
    const updated = await getMachineById(input.id);
    if (!updated) throw new Error("Update failed");
    return updated;
  }

  if (!input.machineInput?.trim()) {
    throw new Error("Enter a machine ID");
  }

  const machineIdHash = hashSerial(input.machineInput);
  const id = uid("m");
  const token = newSessionToken();
  const source = input.source || "manual";
  const productKey = normalizeWhitelistProductKey(input.productKey);
  const stripeSessionId = input.stripeSessionId ?? null;
  const rawSerial = input.rawSerialNote?.trim() || null;

  // Scoped upsert: same serial may exist on another package
  const existing = await findMachineByInput(input.machineInput, productKey);

  if (existing) {
    await sql`
      UPDATE machine_whitelist SET
        key_name = ${keyName},
        machine_id_hash = ${machineIdHash},
        serial_number = NULL,
        hostname = ${input.hostname?.trim() || existing.hostname},
        note = ${input.note?.trim() || existing.note},
        status = ${status},
        expires_at = ${expiresAt},
        last_ip = ${input.lastIp ?? existing.lastIp},
        city = ${input.city ?? existing.city},
        country = ${input.country ?? existing.country},
        os = ${input.os ?? existing.os},
        is_admin = ${input.isAdmin ?? existing.isAdmin},
        product_key = ${productKey},
        source = ${source},
        stripe_session_id = COALESCE(${stripeSessionId}, stripe_session_id),
        raw_serial_note = COALESCE(${rawSerial}, raw_serial_note),
        approx_location = COALESCE(${input.approxLocation ?? null}, approx_location),
        updated_at = now()
      WHERE id = ${existing.id}
    `;
    const updated = await getMachineById(existing.id);
    if (!updated) throw new Error("Update failed");
    return updated;
  }

  await sql`
    INSERT INTO machine_whitelist (
      id, key_name, machine_id_hash, serial_number, hostname, note, status,
      expires_at, session_token, last_ip, city, country, os, is_admin,
      product_key, source, stripe_session_id, raw_serial_note, approx_location
    ) VALUES (
      ${id}, ${keyName}, ${machineIdHash}, ${null}, ${input.hostname?.trim() || null},
      ${input.note?.trim() || null}, ${status}, ${expiresAt}, ${token},
      ${input.lastIp ?? null}, ${input.city ?? null},
      ${input.country ?? null}, ${input.os ?? null}, ${input.isAdmin ?? null},
      ${productKey}, ${source}, ${stripeSessionId}, ${rawSerial},
      ${input.approxLocation?.trim() || null}
    )
  `;
  const created = await getMachineById(id);
  if (!created) throw new Error("Create failed");
  return created;
}

export async function deleteMachine(id: string): Promise<void> {
  await ensureMachineTable();
  const sql = await getSql();
  await sql`DELETE FROM machine_whitelist WHERE id = ${id}`;
}

export async function regenerateToken(id: string): Promise<MachineRow> {
  await ensureMachineTable();
  const sql = await getSql();
  const token = newSessionToken();
  await sql`
    UPDATE machine_whitelist
    SET session_token = ${token}, updated_at = now()
    WHERE id = ${id}
  `;
  const m = await getMachineById(id);
  if (!m) throw new Error("Machine not found");
  return m;
}

/** Public: machine requests verification (status pending). */
export async function requestVerification(input: {
  machineId: string;
  keyName?: string;
  hostname?: string;
  note?: string;
  lastIp?: string;
  city?: string;
  country?: string;
  os?: string;
  isAdmin?: string;
  /** Defaults to general (global) whitelist when omitted. */
  productKey?: string | null;
}): Promise<MachineRow> {
  if (!input.machineId?.trim()) throw new Error("machineId required");
  const scope = normalizeWhitelistProductKey(input.productKey);
  const existing = await findMachineByInput(input.machineId, scope);
  // Don't downgrade active machines
  if (existing && existing.status === "active") {
    return upsertMachine({
      id: existing.id,
      keyName: existing.keyName,
      hostname: input.hostname || existing.hostname || undefined,
      note: existing.note || undefined,
      status: "active",
      forever: !existing.expiresAt,
      expiresAt: existing.expiresAt,
      os: input.os || existing.os || undefined,
      lastIp: input.lastIp,
      isAdmin: input.isAdmin,
      source: existing.source || "request",
      productKey: scope,
    });
  }
  return upsertMachine({
    keyName: input.keyName?.trim() || existing?.keyName || "Pending machine",
    machineInput: input.machineId,
    hostname: input.hostname,
    note: input.note || existing?.note || undefined,
    status: "pending",
    forever: true,
    lastIp: input.lastIp,
    city: input.city,
    country: input.country,
    os: input.os,
    isAdmin: input.isAdmin,
    source: "request",
    rawSerialNote: null,
    productKey: scope,
  });
}

/**
 * Public verify — client sends the raw serial; server hashes it with SHA-256 before lookup.
 * Software authorization is **category**-scoped (`sat` | `act` | `gre` | `gmat` | `proctor`):
 *   - row.product_key must equal the requested category, OR
 *   - row.product_key === "general" (serial keys on General authorize any software)
 * `productKey` like `sat-pro` is mapped to category `sat` for app compatibility.
 * Without category/product context, any active row for that serial authorizes (compat).
 */
export async function verifyMachine(input: {
  machineId: string;
  sessionToken?: string;
  lastIp?: string;
  hostname?: string;
  os?: string;
  isAdmin?: string;
  /** Preferred: software category (`sat`, `act`, …). */
  category?: string | null;
  /** Compat: full product id (`sat-pro`) — mapped to category. */
  productKey?: string | null;
  exam?: string | null;
  tier?: string | null;
}): Promise<{
  ok: boolean;
  authorized: boolean;
  status: string;
  keyName?: string;
  sessionToken?: string | null;
  expiresAt?: string | null;
  reason?: string;
  productKey?: string | null;
  category?: string | null;
}> {
  if (!input.machineId?.trim()) {
    return {
      ok: false,
      authorized: false,
      status: "unknown",
      reason: "machineId required",
    };
  }
  await ensureMachineTable();
  const sql = await getSql();
  const requestedScope = resolveWhitelistProductKey({
    productKey: input.productKey,
    category: input.category,
    exam: input.exam,
    tier: input.tier,
  });
  const hasExplicitProduct =
    Boolean(input.category?.trim()) ||
    Boolean(input.productKey?.trim()) ||
    Boolean(input.exam?.trim());

  let m: MachineRow | null = null;
  if (hasExplicitProduct) {
    m = await findMachineByInput(input.machineId, requestedScope);
    if (!m) {
      // Global/general whitelist still authorizes any package
      m = await findMachineByInput(input.machineId, GENERAL_WHITELIST_KEY);
    }
  } else {
    // No product context: prefer an active scoped row, else any row for the serial
    const all = await findMachinesBySerial(input.machineId);
    m =
      all.find((row) => row.status === "active") ||
      all[0] ||
      null;
  }

  if (!m) {
    return {
      ok: false,
      authorized: false,
      status: "unknown",
      reason: hasExplicitProduct ? "not_registered_for_product" : "not_registered",
      productKey: hasExplicitProduct ? requestedScope : null,
    };
  }

  await sql`
    UPDATE machine_whitelist SET
      last_seen_at = now(),
      last_ip = COALESCE(${input.lastIp ?? null}, last_ip),
      hostname = COALESCE(${input.hostname ?? null}, hostname),
      os = COALESCE(${input.os ?? null}, os),
      is_admin = COALESCE(${input.isAdmin ?? null}, is_admin),
      updated_at = now()
    WHERE id = ${m.id}
  `;

  if (m.expiresAt) {
    const exp = new Date(m.expiresAt).getTime();
    if (!Number.isNaN(exp) && exp < Date.now()) {
      await sql`UPDATE machine_whitelist SET status = 'expired' WHERE id = ${m.id}`;
      return {
        ok: false,
        authorized: false,
        status: "expired",
        keyName: m.keyName,
        reason: "expired",
      };
    }
  }

  if (m.status === "blocked") {
    return {
      ok: false,
      authorized: false,
      status: "blocked",
      keyName: m.keyName,
      reason: "blocked",
    };
  }

  if (m.status === "pending") {
    return {
      ok: false,
      authorized: false,
      status: "pending",
      keyName: m.keyName,
      reason: "awaiting_admin_approval",
    };
  }

  if (m.status !== "active") {
    return {
      ok: false,
      authorized: false,
      status: m.status,
      keyName: m.keyName,
      reason: m.status,
    };
  }

  if (
    input.sessionToken &&
    m.sessionToken &&
    input.sessionToken !== m.sessionToken
  ) {
    return {
      ok: false,
      authorized: false,
      status: "blocked",
      keyName: m.keyName,
      reason: "invalid_token",
    };
  }

  return {
    ok: true,
    authorized: true,
    status: "active",
    keyName: m.keyName,
    sessionToken: m.sessionToken,
    expiresAt: m.expiresAt,
    productKey: m.productKey,
    category: m.productKey,
  };
}

/**
 * ExamHub Daemon entrypoint:
 * GET /api/auth?machineId=<RAW_SERIAL>&os=macos&hostname=…&isAdmin=true
 *
 * Unknown machines are auto-registered as **pending** so admin can approve
 * them in Machines tab. Active → authorized:true.
 */
export async function daemonAuthCheck(input: {
  machineId: string;
  hostname?: string;
  os?: string;
  isAdmin?: string;
  lastIp?: string;
  /** Auto-create pending row when unknown (default true) */
  autoPending?: boolean;
}): Promise<{
  authorized: boolean;
  status: string;
  keyName?: string;
  reason?: string;
  id?: string;
  ok: boolean;
}> {
  if (!input.machineId?.trim()) {
    return {
      authorized: false,
      status: "unknown",
      reason: "machineId required",
      ok: false,
    };
  }

  let existing = await findMachineByInput(input.machineId);

  if (!existing && input.autoPending !== false) {
    existing = await requestVerification({
      machineId: input.machineId,
      keyName: "Daemon pending",
      hostname: input.hostname,
      os: input.os || "macos",
      isAdmin: input.isAdmin,
      lastIp: input.lastIp,
      note: `Raw Serial: ${input.machineId.trim()}`,
    });
  }

  if (!existing) {
    return {
      authorized: false,
      status: "unknown",
      reason: "not_registered",
      ok: false,
    };
  }

  const result = await verifyMachine({
    machineId: input.machineId,
    hostname: input.hostname,
    os: input.os,
    isAdmin: input.isAdmin,
    lastIp: input.lastIp,
  });

  return {
    authorized: result.authorized,
    status: result.status,
    keyName: result.keyName,
    reason: result.reason,
    id: existing.id,
    ok: result.ok,
  };
}

export async function exportMachinesJson(): Promise<{
  exportedAt: string;
  machines: MachineRow[];
}> {
  const machines = await listMachines();
  return { exportedAt: new Date().toISOString(), machines };
}

export async function importMachines(opts: {
  mode: "merge" | "replace";
  importData: string;
}): Promise<{ imported: number }> {
  await ensureMachineTable();
  let parsed: { machines?: MachineRow[] };
  try {
    parsed = JSON.parse(opts.importData);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!parsed || !Array.isArray(parsed.machines)) {
    throw new Error("JSON must contain a machines array");
  }

  const sql = await getSql();
  if (opts.mode === "replace") {
    await sql`DELETE FROM machine_whitelist`;
  }

  let imported = 0;
  for (const m of parsed.machines) {
    const id = m.id || uid("m");
    const importedValue = (m.serialNumber || m.rawSerialNote || "").trim();
    if (!importedValue) continue;
    const machineIdHash = /^[a-f0-9]{64}$/i.test(importedValue)
      ? importedValue.toLowerCase()
      : hashSerial(importedValue);
    const token = m.sessionToken || newSessionToken();
    await sql`
      INSERT INTO machine_whitelist (
        id, key_name, machine_id_hash, serial_number, hostname, note, status,
        expires_at, session_token, last_seen_at, last_ip, city, country, os, is_admin,
        product_key, source, stripe_session_id, raw_serial_note
      ) VALUES (
        ${id},
        ${m.keyName || "Imported"},
        ${machineIdHash},
        ${null},
        ${m.hostname ?? null},
        ${m.note ?? null},
        ${m.status || "pending"},
        ${m.expiresAt ?? null},
        ${token},
        ${m.lastSeenAt ?? null},
        ${m.lastIp ?? null},
        ${m.city ?? null},
        ${m.country ?? null},
        ${m.os ?? null},
        ${m.isAdmin ?? null},
        ${normalizeWhitelistProductKey(m.productKey)},
        ${m.source ?? "import"},
        ${m.stripeSessionId ?? null},
        ${m.rawSerialNote ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        key_name = EXCLUDED.key_name,
        machine_id_hash = EXCLUDED.machine_id_hash,
        serial_number = NULL,
        hostname = EXCLUDED.hostname,
        note = EXCLUDED.note,
        status = EXCLUDED.status,
        expires_at = EXCLUDED.expires_at,
        session_token = EXCLUDED.session_token,
        updated_at = now()
    `;
    imported++;
  }
  return { imported };
}



export type ManualAuthKeyRow = {
  id: string;
  category: string;
  authKey: string;
  keyName: string;
  note: string | null;
  status: string;
  expiresAt: string | null;
  source: string | null;
  createdAt?: string;
};

const SOFTWARE_CATS = new Set(["sat", "act", "gre", "gmat", "proctor"]);


/** Stripe (or similar) purchase → one active auth code for the software category. No serial. */
export async function issuePurchaseAuthKey(input: {
  /** Full product id or category (`sat-pro` → `sat`) */
  productKey: string;
  stripeSessionId: string;
  os?: string | null;
  keyName?: string;
  note?: string | null;
}): Promise<{ row: MachineRow; authCode: string; created: boolean }> {
  await ensureMachineTable();
  const sql = await getSql();
  const sessionId = input.stripeSessionId.trim();
  if (!sessionId) throw new Error("stripeSessionId required");
  const category = normalizeWhitelistProductKey(input.productKey);
  if (!SOFTWARE_CATS.has(category) && category !== GENERAL_WHITELIST_KEY) {
    throw new Error(`Not a software category: ${category}`);
  }

  // Idempotent: reuse existing active token for this Stripe session
  const existing = (await sql`
    SELECT * FROM machine_whitelist
    WHERE stripe_session_id = ${sessionId}
      AND session_token IS NOT NULL
      AND status <> 'blocked'
    ORDER BY created_at DESC
    LIMIT 1
  `) as Array<Record<string, unknown>>;
  if (existing[0]) {
    const m = rowToMachine(existing[0]);
    return {
      row: m,
      authCode: m.sessionToken!,
      created: false,
    };
  }

  const id = uid("m");
  const token = newSessionToken();
  const os = input.os?.trim() || null;
  const keyName =
    input.keyName?.trim() ||
    `Purchase · ${category.toUpperCase()} · auth code`;
  const note =
    input.note?.trim() ||
    `Stripe purchase auth code for category ${category} (no serial)`;

  await sql`
    INSERT INTO machine_whitelist (
      id, key_name, machine_id_hash, serial_number, hostname, note, status,
      expires_at, session_token, product_key, source, stripe_session_id, os
    ) VALUES (
      ${id}, ${keyName}, ${null}, ${null}, ${null}, ${note}, 'active',
      ${null}, ${token}, ${category}, 'stripe', ${sessionId}, ${os}
    )
  `;

  const row = await getMachineById(id);
  if (!row?.sessionToken) throw new Error("Failed to issue auth code");
  return { row, authCode: row.sessionToken, created: true };
}


/** Admin: mint an auth key for a software category (no Stripe). Key stays valid until revoke/expiry. */
export async function createManualAuthKey(input: {
  category: string;
  keyName?: string;
  note?: string | null;
  /** ISO expiry; omit / null = never expires until redeemed */
  expiresAt?: string | null;
}): Promise<ManualAuthKeyRow> {
  await ensureMachineTable();
  const category = normalizeWhitelistProductKey(input.category);
  if (!SOFTWARE_CATS.has(category)) {
    throw new Error(
      "Category must be sat, act, gre, gmat, or proctor (not general / research)",
    );
  }
  const sql = await getSql();
  const id = uid("m");
  const token = newSessionToken();
  const keyName =
    input.keyName?.trim() ||
    `Admin key · ${category.toUpperCase()}`;
  const note =
    input.note?.trim() ||
    `Manual auth key for category ${category}`;
  const expiresAt =
    input.expiresAt && input.expiresAt.trim()
      ? new Date(input.expiresAt).toISOString()
      : null;
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
    throw new Error("Invalid expiresAt");
  }

  // Auth-key credential row: session_token is the long-lived auth key (not burned on use).
  // Unique (hash, product_key) only applies when hash is NOT NULL.
  await sql`
    INSERT INTO machine_whitelist (
      id, key_name, machine_id_hash, serial_number, hostname, note, status,
      expires_at, session_token, product_key, source, stripe_session_id
    ) VALUES (
      ${id}, ${keyName}, ${null}, ${null}, ${null}, ${note}, 'active',
      ${expiresAt}, ${token}, ${category}, 'admin', ${null}
    )
  `;

  return {
    id,
    category,
    authKey: token,
    keyName,
    note,
    status: "active",
    expiresAt,
    source: "admin",
    createdAt: new Date().toISOString(),
  };
}

export type AuthKeyListRow = ManualAuthKeyRow & {
  lastSeenAt?: string | null;
  hostname?: string | null;
  lastIp?: string | null;
  approxLocation?: string | null;
  effectiveStatus: "active" | "revoked" | "expired" | "pending" | string;
};

function effectiveAuthKeyStatus(m: MachineRow): string {
  if (!m.sessionToken && (m.status === "blocked" || m.source === "admin" || m.source === "stripe")) {
    if (m.status === "blocked") return "revoked";
  }
  if (!m.sessionToken) return m.status === "blocked" ? "revoked" : m.status;
  if (m.status === "blocked") return "revoked";
  if (m.expiresAt) {
    const exp = new Date(m.expiresAt).getTime();
    if (!Number.isNaN(exp) && exp < Date.now()) return "expired";
  }
  if (m.status === "expired") return "expired";
  if (m.status === "pending") return "pending";
  if (m.status === "active" && m.sessionToken) return "active";
  return m.status || "unknown";
}

/** List software auth keys (admin + stripe) for admin UI. */
export async function listAuthKeys(
  category?: string | null,
): Promise<AuthKeyListRow[]> {
  await ensureMachineTable();
  const sql = await getSql();
  const scope = category?.trim()
    ? normalizeWhitelistProductKey(category)
    : null;
  const rows = (
    scope
      ? await sql`
          SELECT * FROM machine_whitelist
          WHERE product_key = ${scope}
            AND (
              session_token IS NOT NULL
              OR source IN ('admin', 'stripe')
            )
            AND product_key IN ('sat','act','gre','gmat','proctor','general')
          ORDER BY created_at DESC
          LIMIT 300
        `
      : await sql`
          SELECT * FROM machine_whitelist
          WHERE (
              session_token IS NOT NULL
              OR source IN ('admin', 'stripe')
            )
            AND (
              product_key IN ('sat','act','gre','gmat','proctor')
              OR (source = 'admin' AND product_key IN ('sat','act','gre','gmat','proctor'))
            )
          ORDER BY created_at DESC
          LIMIT 300
        `
  ) as Array<Record<string, unknown>>;

  return rows.map((r) => {
    const m = rowToMachine(r);
    const eff = effectiveAuthKeyStatus(m);
    return {
      id: m.id,
      category: normalizeWhitelistProductKey(m.productKey),
      authKey: m.sessionToken || "",
      keyName: m.keyName,
      note: m.note,
      status: m.status,
      effectiveStatus: eff,
      expiresAt: m.expiresAt,
      source: m.source,
      createdAt: m.createdAt,
      lastSeenAt: m.lastSeenAt,
      hostname: m.hostname,
      lastIp: m.lastIp,
      approxLocation: m.approxLocation,
    };
  });
}

/** @deprecated alias — use listAuthKeys */
export async function listUnusedManualAuthKeys(
  category?: string | null,
): Promise<ManualAuthKeyRow[]> {
  const all = await listAuthKeys(category);
  return all.filter((k) => k.effectiveStatus === "active" && k.authKey);
}

export async function revokeManualAuthKey(id: string): Promise<void> {
  await ensureMachineTable();
  const sql = await getSql();
  const rows = (await sql`
    SELECT id, source, session_token, product_key FROM machine_whitelist
    WHERE id = ${id} LIMIT 1
  `) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) throw new Error("Key not found");
  const pk = normalizeWhitelistProductKey(String(row.product_key || ""));
  if (!SOFTWARE_CATS.has(pk) && pk !== "general") {
    throw new Error("Not a software auth key");
  }
  await sql`
    UPDATE machine_whitelist SET
      session_token = NULL,
      status = 'blocked',
      note = COALESCE(note, '') || E'\n[revoked by admin]',
      updated_at = now()
    WHERE id = ${id}
  `;
}


/** Mask auth keys for admin/console logs (never log full token). */
export function maskAuthKey(key: string | null | undefined): string {
  const k = (key || "").trim();
  if (!k) return "(empty)";
  if (k.length <= 8) return `${k.slice(0, 2)}…`;
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

/** Simple in-memory rate limit for failed redeem attempts (fail closed). */
const redeemFailures = new Map<string, { count: number; resetAt: number }>();
const REDEEM_WINDOW_MS = 15 * 60 * 1000;
const REDEEM_MAX_FAILURES = 12;

function redeemRateKey(ip: string | undefined, authHint: string): string {
  return `${ip || "unknown"}:${authHint.slice(0, 8)}`;
}

export function assertRedeemNotRateLimited(
  ip: string | undefined,
  authKey: string,
): void {
  const key = redeemRateKey(ip, authKey);
  const now = Date.now();
  const row = redeemFailures.get(key);
  if (!row) return;
  if (row.resetAt < now) {
    redeemFailures.delete(key);
    return;
  }
  if (row.count >= REDEEM_MAX_FAILURES) {
    throw new Error("Too many invalid redeem attempts — try again later");
  }
}

export function recordRedeemFailure(ip: string | undefined, authKey: string): void {
  const key = redeemRateKey(ip, authKey);
  const now = Date.now();
  const row = redeemFailures.get(key);
  if (!row || row.resetAt < now) {
    redeemFailures.set(key, { count: 1, resetAt: now + REDEEM_WINDOW_MS });
    return;
  }
  row.count += 1;
}

export function clearRedeemFailures(ip: string | undefined, authKey: string): void {
  redeemFailures.delete(redeemRateKey(ip, authKey));
}

export async function findMachineByAuthKey(
  authKey: string,
): Promise<MachineRow | null> {
  await ensureMachineTable();
  const token = authKey.trim();
  if (!token) return null;
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM machine_whitelist
    WHERE session_token = ${token}
    LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows[0] ? rowToMachine(rows[0]) : null;
}

export type AuthKeyAuthorizeInput = {
  authKey: string;
  /** Optional software category check (`sat`…). Must match key category or key is `general`. */
  category?: string | null;
  productKey?: string | null;
  exam?: string | null;
  tier?: string | null;
  hostname?: string | null;
  ip?: string | null;
  approxLocation?: string | null;
  requestIp?: string | null;
  os?: string | null;
};

/** @deprecated kept for type compat — serial no longer used */
export type RedeemAuthInput = AuthKeyAuthorizeInput & {
  serialNumber?: string;
};

/**
 * Authorize by auth key alone (Stripe-issued or admin-generated).
 * Key stays active until admin revoke or expiry — NOT burned on use.
 * Optional hostname / ip / approxLocation are stored as last-seen metadata.
 */
export async function authorizeByAuthKey(input: AuthKeyAuthorizeInput): Promise<{
  ok: true;
  authorized: true;
  status: "active";
  keyId: string;
  productKey: string | null;
  category: string | null;
  keyName: string;
  expiresAt: string | null;
}> {
  const authKey = input.authKey?.trim() || "";
  if (!authKey) throw new Error("authKey required");

  assertRedeemNotRateLimited(input.requestIp || undefined, authKey);

  await ensureMachineTable();
  const sql = await getSql();
  const machine = await findMachineByAuthKey(authKey);

  if (!machine || !machine.sessionToken) {
    recordRedeemFailure(input.requestIp || undefined, authKey);
    throw new Error("Invalid auth key");
  }

  if (machine.status === "blocked") {
    recordRedeemFailure(input.requestIp || undefined, authKey);
    throw new Error("Auth key is revoked");
  }

  if (machine.status === "expired") {
    recordRedeemFailure(input.requestIp || undefined, authKey);
    throw new Error("Auth key expired");
  }

  if (machine.expiresAt) {
    const exp = new Date(machine.expiresAt).getTime();
    if (!Number.isNaN(exp) && exp < Date.now()) {
      await sql`UPDATE machine_whitelist SET status = 'expired', updated_at = now() WHERE id = ${machine.id}`;
      recordRedeemFailure(input.requestIp || undefined, authKey);
      throw new Error("Auth key expired");
    }
  }

  // pending admin keys / stripe should be treatable as active credentials once issued
  if (machine.status === "pending") {
    // promote to active on first successful authorize
  } else if (machine.status !== "active") {
    recordRedeemFailure(input.requestIp || undefined, authKey);
    throw new Error(`Auth key status: ${machine.status}`);
  }

  const keyCategory = normalizeWhitelistProductKey(machine.productKey);
  const requested = resolveWhitelistProductKey({
    productKey: input.productKey,
    category: input.category,
    exam: input.exam,
    tier: input.tier,
  });
  const hasExplicit =
    Boolean(input.category?.trim()) ||
    Boolean(input.productKey?.trim()) ||
    Boolean(input.exam?.trim());

  if (hasExplicit) {
    const ok =
      keyCategory === GENERAL_WHITELIST_KEY ||
      keyCategory === requested;
    if (!ok) {
      recordRedeemFailure(input.requestIp || undefined, authKey);
      throw new Error(
        `Auth key is for category ${keyCategory}, not ${requested}`,
      );
    }
  }

  const ip =
    (input.requestIp?.trim() || input.ip?.trim() || null) ?? null;
  const hostname = input.hostname?.trim() || null;
  const approx = input.approxLocation?.trim() || null;
  const os = input.os?.trim() || null;

  await sql`
    UPDATE machine_whitelist SET
      status = 'active',
      hostname = COALESCE(${hostname}, hostname),
      last_ip = COALESCE(${ip}, last_ip),
      approx_location = COALESCE(${approx}, approx_location),
      os = COALESCE(${os}, os),
      last_seen_at = now(),
      updated_at = now()
    WHERE id = ${machine.id}
      AND session_token = ${authKey}
  `;

  clearRedeemFailures(input.requestIp || undefined, authKey);

  const refreshed = await getMachineById(machine.id);
  const cat = normalizeWhitelistProductKey(
    refreshed?.productKey ?? machine.productKey,
  );

  return {
    ok: true,
    authorized: true,
    status: "active",
    keyId: machine.id,
    productKey: cat,
    category: cat,
    keyName: refreshed?.keyName ?? machine.keyName,
    expiresAt: refreshed?.expiresAt ?? machine.expiresAt,
  };
}

/** Soft alias: activate = authorize (no burn, no serial). */
export async function redeemAuthKey(input: RedeemAuthInput) {
  return authorizeByAuthKey(input);
}

export async function verifyAuthKey(input: AuthKeyAuthorizeInput) {
  return authorizeByAuthKey(input);
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      // Daemon may call from native app origin
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

export function jsonError(err: unknown, status = 400): Response {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Error";
  const code = message === "Forbidden" ? 403 : status;
  return json({ error: message, authorized: false }, code);
}

export async function clientIp(request: Request): Promise<string | undefined> {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

/** Shared handler for Daemon GET /api/auth?machineId=… */
export async function handleDaemonAuthRequest(
  request: Request,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return json({ ok: true });
  }
  const url = new URL(request.url);
  const machineId =
    url.searchParams.get("machineId")?.trim() ||
    url.searchParams.get("machine_id")?.trim() ||
    "";
  if (!machineId) {
    // Not a daemon call — caller should fall through to Better Auth
    return new Response(null, { status: 404 });
  }
  try {
    const result = await daemonAuthCheck({
      machineId,
      hostname: url.searchParams.get("hostname") || undefined,
      os: url.searchParams.get("os") || "macos",
      isAdmin: url.searchParams.get("isAdmin") || undefined,
      lastIp: await clientIp(request),
      autoPending: true,
    });
    // Exact shape Daemon reads: dict[@"authorized"] boolValue
    return json({
      authorized: result.authorized,
      status: result.status,
      keyName: result.keyName ?? null,
      reason: result.reason ?? null,
      id: result.id ?? null,
      ok: result.ok,
    });
  } catch (err) {
    return jsonError(err, 400);
  }
}

export function isDaemonAuthRequest(request: Request): boolean {
  try {
    const url = new URL(request.url);
    return Boolean(
      url.searchParams.get("machineId") ||
        url.searchParams.get("machine_id"),
    );
  } catch {
    return false;
  }
}
