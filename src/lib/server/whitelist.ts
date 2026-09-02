/**
 * Machine whitelist / verification store.
 *
 * Clients send the raw serial. ExamHub canonicalizes it, hashes it with
 * SHA-256 server-side, and stores/compares only the digest.
 */
import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { isLockedAdminEmail } from "@/lib/admin-lock";

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
      await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS machine_whitelist_hash_uidx ON machine_whitelist (machine_id_hash) WHERE machine_id_hash IS NOT NULL`);
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
    productKey: (r.product_key as string) ?? null,
    source: (r.source as string) ?? null,
    stripeSessionId: (r.stripe_session_id as string) ?? null,
    rawSerialNote: (r.raw_serial_note as string) ?? null,
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
): Promise<MachineRow | null> {
  await ensureMachineTable();
  const sql = await getSql();
  const serial = normalizeSerial(machineInput);
  if (!serial) return null;
  const digest = hashSerial(serial);
  const rows = (await sql`
    SELECT * FROM machine_whitelist
    WHERE machine_id_hash = ${digest}
    LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows[0] ? rowToMachine(rows[0]) : null;
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

    await sql`
      UPDATE machine_whitelist SET
        key_name = ${keyName},
        machine_id_hash = ${machineIdHash},
        serial_number = NULL,
        hostname = ${input.hostname?.trim() || existing.hostname},
        note = ${input.note?.trim() ?? existing.note},
        status = ${status},
        expires_at = ${expiresAt},
        product_key = COALESCE(${input.productKey ?? null}, product_key),
        source = COALESCE(${input.source ?? null}, source),
        stripe_session_id = COALESCE(${input.stripeSessionId ?? null}, stripe_session_id),
        raw_serial_note = COALESCE(${input.rawSerialNote ?? null}, raw_serial_note),
        os = COALESCE(${input.os ?? null}, os),
        is_admin = COALESCE(${input.isAdmin ?? null}, is_admin),
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
  const productKey = input.productKey ?? null;
  const stripeSessionId = input.stripeSessionId ?? null;
  const rawSerial = input.rawSerialNote?.trim() || null;

  const existing = await findMachineByInput(input.machineInput);

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
        product_key = COALESCE(${productKey}, product_key),
        source = ${source},
        stripe_session_id = COALESCE(${stripeSessionId}, stripe_session_id),
        raw_serial_note = COALESCE(${rawSerial}, raw_serial_note),
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
      product_key, source, stripe_session_id, raw_serial_note
    ) VALUES (
      ${id}, ${keyName}, ${machineIdHash}, ${null}, ${input.hostname?.trim() || null},
      ${input.note?.trim() || null}, ${status}, ${expiresAt}, ${token},
      ${input.lastIp ?? null}, ${input.city ?? null},
      ${input.country ?? null}, ${input.os ?? null}, ${input.isAdmin ?? null},
      ${productKey}, ${source}, ${stripeSessionId}, ${rawSerial}
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
}): Promise<MachineRow> {
  if (!input.machineId?.trim()) throw new Error("machineId required");
  const existing = await findMachineByInput(input.machineId);
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
  });
}

/**
 * Public verify — client sends the raw serial; server hashes it with SHA-256 before lookup.
 * Returns active | pending | blocked | expired | unknown.
 */
export async function verifyMachine(input: {
  machineId: string;
  sessionToken?: string;
  lastIp?: string;
  hostname?: string;
  os?: string;
  isAdmin?: string;
}): Promise<{
  ok: boolean;
  authorized: boolean;
  status: string;
  keyName?: string;
  sessionToken?: string | null;
  expiresAt?: string | null;
  reason?: string;
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
  const m = await findMachineByInput(input.machineId);

  if (!m) {
    return {
      ok: false,
      authorized: false,
      status: "unknown",
      reason: "not_registered",
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
        ${m.productKey ?? null},
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
