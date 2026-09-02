/**
 * Stripe payment records + product mapping for post-purchase activation.
 */
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";

export type ProductKind =
  | "sat"
  | "act"
  | "proctor"
  | "research"
  | "internship"
  | "bundle"
  | "tools"
  | "contests"
  | "unknown";

export type StripePayment = {
  id: string;
  sessionId: string;
  paymentIntent: string | null;
  amountCents: number;
  currency: string;
  productKey: string;
  productLabel: string | null;
  customerEmail: string | null;
  status: string;
  consumed: boolean;
  consumeCount: number;
  maxSerials: number;
  serviceToken: string | null;
  metaJson: string | null;
  createdAt?: string;
};

function uid(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

let ready: Promise<void> | null = null;

export async function ensureStripeTables(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    const sql = await getSql();
    await sql.query(`
CREATE TABLE IF NOT EXISTS stripe_payments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  payment_intent TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  product_key TEXT NOT NULL DEFAULT 'unknown',
  product_label TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  consumed BOOLEAN NOT NULL DEFAULT false,
  consume_count INTEGER NOT NULL DEFAULT 0,
  max_serials INTEGER NOT NULL DEFAULT 2,
  service_token TEXT,
  meta_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
    await sql.query(
      `CREATE INDEX IF NOT EXISTS stripe_payments_product_idx ON stripe_payments (product_key)`,
    );
    await sql.query(`
CREATE TABLE IF NOT EXISTS service_projects (
  id TEXT PRIMARY KEY,
  public_token TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  stripe_session_id TEXT,
  contact_method TEXT,
  contact_value TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  delivery_url TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  title TEXT,
  notes TEXT,
  admin_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
    await sql.query(`
CREATE TABLE IF NOT EXISTS delivery_assets (
  id TEXT PRIMARY KEY,
  scope_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT,
  tier TEXT,
  os TEXT,
  file_url TEXT,
  message TEXT,
  steps TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
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
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

export function productKeyFromAmount(cents: number): string {
  if (cents >= 88000 && cents <= 90000) return "premium";
  if (cents >= 79000 && cents <= 81000) return "research";
  if (cents >= 74000 && cents <= 76000) return "internship";
  if (cents >= 44000 && cents <= 46000) return "pro";
  if (cents >= 18000 && cents <= 20000) return "standard";
  return "unknown";
}

export function classifyProductKey(key: string): {
  kind: ProductKind;
  exam?: "sat" | "act";
  tier?: "standard" | "pro" | "premium";
  flow: "os_serial" | "progress" | "proctor_serial";
} {
  const k = (key || "unknown").toLowerCase();

  if (k === "research" || k.startsWith("research")) {
    return { kind: "research", flow: "progress" };
  }
  if (k === "internship" || k.startsWith("intern")) {
    return { kind: "internship", flow: "progress" };
  }
  if (k === "premium" || k === "pro" || k === "standard") {
    return {
      kind: "sat",
      tier: k as "standard" | "pro" | "premium",
      flow: "os_serial",
    };
  }
  if (k.startsWith("sat-") || k === "sat") {
    const tier = k.includes("premium")
      ? "premium"
      : k.includes("pro")
        ? "pro"
        : "standard";
    return { kind: "sat", exam: "sat", tier, flow: "os_serial" };
  }
  if (k.startsWith("act-") || k === "act") {
    const tier = k.includes("premium")
      ? "premium"
      : k.includes("pro")
        ? "pro"
        : "standard";
    return { kind: "act", exam: "act", tier, flow: "os_serial" };
  }
  if (k.includes("bundle")) {
    return { kind: "bundle", flow: "os_serial" };
  }
  if (
    k.startsWith("proctor") ||
    k.includes("lockdown") ||
    k.includes("honor") ||
    k.includes("proctorio")
  ) {
    return { kind: "proctor", flow: "proctor_serial" };
  }
  if (k.startsWith("contest") || k.startsWith("tool")) {
    return { kind: "tools", flow: "proctor_serial" };
  }
  return { kind: "unknown", flow: "os_serial" };
}

function rowToPayment(r: Record<string, unknown>): StripePayment {
  return {
    id: String(r.id),
    sessionId: String(r.session_id),
    paymentIntent: (r.payment_intent as string) ?? null,
    amountCents: Number(r.amount_cents ?? 0),
    currency: String(r.currency ?? "usd"),
    productKey: String(r.product_key ?? "unknown"),
    productLabel: (r.product_label as string) ?? null,
    customerEmail: (r.customer_email as string) ?? null,
    status: String(r.status ?? "paid"),
    consumed: Boolean(r.consumed),
    consumeCount: Number(r.consume_count ?? 0),
    maxSerials: Number(r.max_serials ?? 2),
    serviceToken: (r.service_token as string) ?? null,
    metaJson: (r.meta_json as string) ?? null,
    createdAt: r.created_at
      ? new Date(r.created_at as string).toISOString()
      : undefined,
  };
}

export async function upsertPaidSession(input: {
  sessionId: string;
  paymentIntent?: string | null;
  amountCents: number;
  currency?: string;
  productKey?: string;
  productLabel?: string | null;
  customerEmail?: string | null;
  meta?: Record<string, unknown>;
}): Promise<StripePayment> {
  await ensureStripeTables();
  const sql = await getSql();
  const productKey =
    input.productKey?.trim() ||
    productKeyFromAmount(input.amountCents) ||
    "unknown";
  const maxSerials =
    productKey === "research" || productKey === "internship" ? 1 : 2;

  const existing = (await sql`
    SELECT * FROM stripe_payments WHERE session_id = ${input.sessionId} LIMIT 1
  `) as Array<Record<string, unknown>>;

  if (existing[0]) {
    await sql`
      UPDATE stripe_payments SET
        payment_intent = COALESCE(${input.paymentIntent ?? null}, payment_intent),
        amount_cents = ${input.amountCents},
        currency = ${input.currency ?? "usd"},
        product_key = ${productKey},
        product_label = COALESCE(${input.productLabel ?? null}, product_label),
        customer_email = COALESCE(${input.customerEmail ?? null}, customer_email),
        status = 'paid',
        meta_json = COALESCE(${input.meta ? JSON.stringify(input.meta) : null}, meta_json),
        updated_at = now()
      WHERE session_id = ${input.sessionId}
    `;
    const rows = (await sql`
      SELECT * FROM stripe_payments WHERE session_id = ${input.sessionId} LIMIT 1
    `) as Array<Record<string, unknown>>;
    return rowToPayment(rows[0]!);
  }

  const id = uid("pay");
  await sql`
    INSERT INTO stripe_payments (
      id, session_id, payment_intent, amount_cents, currency,
      product_key, product_label, customer_email, status,
      consumed, consume_count, max_serials, meta_json
    ) VALUES (
      ${id}, ${input.sessionId}, ${input.paymentIntent ?? null},
      ${input.amountCents}, ${input.currency ?? "usd"},
      ${productKey}, ${input.productLabel ?? null},
      ${input.customerEmail ?? null}, 'paid',
      false, 0, ${maxSerials},
      ${input.meta ? JSON.stringify(input.meta) : null}
    )
  `;
  const rows = (await sql`
    SELECT * FROM stripe_payments WHERE id = ${id} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rowToPayment(rows[0]!);
}

export async function getPaymentBySession(
  sessionId: string,
): Promise<StripePayment | null> {
  await ensureStripeTables();
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM stripe_payments WHERE session_id = ${sessionId} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows[0] ? rowToPayment(rows[0]) : null;
}

export async function ensurePaymentFromStripeApi(
  sessionId: string,
): Promise<StripePayment | null> {
  const existing = await getPaymentBySession(sessionId);
  if (existing && existing.status === "paid") return existing;

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return existing;
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return null;
  }

  const amount = session.amount_total ?? 0;
  const ref =
    (session.client_reference_id as string | null) ||
    (session.metadata?.product_key as string | undefined) ||
    productKeyFromAmount(amount);

  return upsertPaidSession({
    sessionId: session.id,
    paymentIntent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    amountCents: amount,
    currency: session.currency ?? "usd",
    productKey: ref,
    productLabel: session.metadata?.product_label ?? null,
    customerEmail:
      session.customer_details?.email ||
      session.customer_email ||
      null,
    meta: {
      mode: session.mode,
      metadata: session.metadata,
    },
  });
}

export async function markSerialConsumed(
  sessionId: string,
): Promise<StripePayment> {
  await ensureStripeTables();
  const sql = await getSql();
  const pay = await getPaymentBySession(sessionId);
  if (!pay) throw new Error("Payment not found");
  if (pay.consumeCount >= pay.maxSerials) {
    throw new Error(
      `Serial limit reached (${pay.maxSerials}) for this payment`,
    );
  }
  const next = pay.consumeCount + 1;
  const consumed = next >= pay.maxSerials;
  await sql`
    UPDATE stripe_payments SET
      consume_count = ${next},
      consumed = ${consumed},
      updated_at = now()
    WHERE session_id = ${sessionId}
  `;
  const updated = await getPaymentBySession(sessionId);
  if (!updated) throw new Error("Update failed");
  return updated;
}

export async function attachServiceToken(
  sessionId: string,
  token: string,
): Promise<void> {
  await ensureStripeTables();
  const sql = await getSql();
  const pay = await getPaymentBySession(sessionId);
  const nextCount = Math.max(pay?.consumeCount ?? 0, 1);
  await sql`
    UPDATE stripe_payments SET
      service_token = ${token},
      consumed = true,
      consume_count = ${nextCount},
      updated_at = now()
    WHERE session_id = ${sessionId}
  `;
}

export function encryptSerial(plain: string): string {
  const secret =
    process.env.SERIAL_ENCRYPTION_KEY ||
    process.env.BETTER_AUTH_SECRET ||
    "examhub-dev-serial-key-change-me";
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptSerial(blob: string): string | null {
  if (!blob.startsWith("enc:")) return null;
  try {
    const secret =
      process.env.SERIAL_ENCRYPTION_KEY ||
      process.env.BETTER_AUTH_SECRET ||
      "examhub-dev-serial-key-change-me";
    const key = createHash("sha256").update(secret).digest();
    const [ivB, tagB, dataB] = blob.slice(4).split(".");
    if (!ivB || !tagB || !dataB) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivB, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB, "base64url")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

export function publicSiteOrigin(request?: Request): string {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL.replace(/\/+$/, "");
  }
  if (request) {
    const u = new URL(request.url);
    return u.origin;
  }
  return "https://examhub.shop";
}
