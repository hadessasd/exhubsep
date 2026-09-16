/**
 * Admin-configurable Stripe Payment Links per product/tier.
 * Catalog defaults (SAT/ACT live URLs) win unless an admin override is set.
 */
import { getSql } from "@/lib/db";
import { ensureStripeTables } from "@/lib/server/stripe-payments";
import {
  STRIPE_PAYMENT_LINKS,
  withStripeClientReference,
} from "@/lib/data/stripe";
import { getProductBySlug, PRODUCTS } from "@/lib/data/catalog";

export type ProductPaymentLink = {
  productKey: string;
  label: string | null;
  examFamily: string | null;
  tier: string | null;
  paymentLinkUrl: string;
  buyButtonId: string | null;
  notes: string | null;
  updatedAt?: string;
  /** Resolved URL used at checkout (override or catalog default). */
  resolvedUrl: string;
  source: "admin" | "catalog" | "empty";
};

let linksReady: Promise<void> | null = null;

export async function ensurePaymentLinkTables(): Promise<void> {
  if (linksReady) return linksReady;
  linksReady = (async () => {
    await ensureStripeTables();
    const sql = await getSql();
    await sql.query(`
CREATE TABLE IF NOT EXISTS product_payment_links (
  product_key TEXT PRIMARY KEY,
  label TEXT,
  exam_family TEXT,
  tier TEXT,
  payment_link_url TEXT NOT NULL DEFAULT '',
  buy_button_id TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
    await sql.query(
      `CREATE INDEX IF NOT EXISTS product_payment_links_exam_idx ON product_payment_links (exam_family)`,
    );
    // Seed GMAT/GRE empty placeholders
    for (const exam of ["gmat", "gre"] as const) {
      for (const tier of ["standard", "pro", "premium"] as const) {
        const key = `${exam}-${tier}`;
        const label = `${exam.toUpperCase()} ${tier[0]!.toUpperCase()}${tier.slice(1)}`;
        await sql`
          INSERT INTO product_payment_links (product_key, label, exam_family, tier, payment_link_url, notes)
          VALUES (
            ${key}, ${label}, ${exam}, ${tier}, '',
            ${"Paste Stripe Payment Link (buy.stripe.com) when ready"}
          )
          ON CONFLICT (product_key) DO NOTHING
        `;
      }
    }
  })().catch((e) => {
    linksReady = null;
    throw e;
  });
  return linksReady;
}

function catalogDefaultUrl(productKey: string): string {
  const p = getProductBySlug(productKey);
  if (p?.stripePaymentLinkUrl?.trim()) return p.stripePaymentLinkUrl.trim();
  const tier = (p?.tier ||
    (["standard", "pro", "premium"].includes(productKey)
      ? productKey
      : undefined)) as "standard" | "pro" | "premium" | undefined;
  if (tier && STRIPE_PAYMENT_LINKS[tier]) {
    return STRIPE_PAYMENT_LINKS[tier].trim();
  }
  return "";
}

function rowToLink(
  r: Record<string, unknown>,
): Omit<ProductPaymentLink, "resolvedUrl" | "source"> {
  return {
    productKey: String(r.product_key),
    label: (r.label as string) ?? null,
    examFamily: (r.exam_family as string) ?? null,
    tier: (r.tier as string) ?? null,
    paymentLinkUrl: String(r.payment_link_url ?? ""),
    buyButtonId: (r.buy_button_id as string) ?? null,
    notes: (r.notes as string) ?? null,
    updatedAt: r.updated_at
      ? new Date(r.updated_at as string).toISOString()
      : undefined,
  };
}

function resolve(
  productKey: string,
  adminUrl: string,
): { resolvedUrl: string; source: "admin" | "catalog" | "empty" } {
  const override = adminUrl.trim();
  if (override) return { resolvedUrl: override, source: "admin" };
  const fallback = catalogDefaultUrl(productKey);
  if (fallback) return { resolvedUrl: fallback, source: "catalog" };
  return { resolvedUrl: "", source: "empty" };
}

export async function listPaymentLinks(): Promise<ProductPaymentLink[]> {
  await ensurePaymentLinkTables();
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM product_payment_links ORDER BY exam_family NULLS LAST, tier, product_key
  `) as Array<Record<string, unknown>>;

  const fromDb = new Map(
    rows.map((r) => {
      const base = rowToLink(r);
      const res = resolve(base.productKey, base.paymentLinkUrl);
      return [base.productKey, { ...base, ...res } satisfies ProductPaymentLink];
    }),
  );

  // Ensure exam products appear even if seed lagged
  const examKeys = PRODUCTS.filter((p) =>
    ["sat", "act", "gmat", "gre"].includes(p.category),
  );
  for (const p of examKeys) {
    if (fromDb.has(p.id)) continue;
    const res = resolve(p.id, "");
    fromDb.set(p.id, {
      productKey: p.id,
      label: p.name,
      examFamily: p.category,
      tier: p.tier ?? null,
      paymentLinkUrl: "",
      buyButtonId: p.stripeBuyButtonId ?? null,
      notes:
        p.category === "gmat" || p.category === "gre"
          ? "Paste Stripe Payment Link when ready"
          : null,
      resolvedUrl: res.resolvedUrl,
      source: res.source,
    });
  }

  return [...fromDb.values()].sort((a, b) =>
    a.productKey.localeCompare(b.productKey),
  );
}

export async function upsertPaymentLink(input: {
  productKey: string;
  label?: string | null;
  examFamily?: string | null;
  tier?: string | null;
  paymentLinkUrl: string;
  buyButtonId?: string | null;
  notes?: string | null;
}): Promise<ProductPaymentLink> {
  await ensurePaymentLinkTables();
  const sql = await getSql();
  const key = input.productKey.trim().toLowerCase();
  const url = input.paymentLinkUrl.trim();
  // Reject fake placeholders that look live but aren't real
  if (url && !/^https:\/\/buy\.stripe\.com\//i.test(url) && !/^https:\/\/stripe\.com\//i.test(url)) {
    // Allow empty; otherwise require buy.stripe.com (or stripe.com) hosts
    if (url.startsWith("http")) {
      throw new Error("Payment link must be a buy.stripe.com URL (or leave empty)");
    }
  }

  await sql`
    INSERT INTO product_payment_links (
      product_key, label, exam_family, tier, payment_link_url, buy_button_id, notes, updated_at
    ) VALUES (
      ${key},
      ${input.label?.trim() || null},
      ${input.examFamily?.trim() || null},
      ${input.tier?.trim() || null},
      ${url},
      ${input.buyButtonId?.trim() || null},
      ${input.notes?.trim() || null},
      now()
    )
    ON CONFLICT (product_key) DO UPDATE SET
      label = COALESCE(EXCLUDED.label, product_payment_links.label),
      exam_family = COALESCE(EXCLUDED.exam_family, product_payment_links.exam_family),
      tier = COALESCE(EXCLUDED.tier, product_payment_links.tier),
      payment_link_url = EXCLUDED.payment_link_url,
      buy_button_id = COALESCE(EXCLUDED.buy_button_id, product_payment_links.buy_button_id),
      notes = COALESCE(EXCLUDED.notes, product_payment_links.notes),
      updated_at = now()
  `;

  const rows = (await sql`
    SELECT * FROM product_payment_links WHERE product_key = ${key} LIMIT 1
  `) as Array<Record<string, unknown>>;
  const base = rowToLink(rows[0]!);
  const res = resolve(base.productKey, base.paymentLinkUrl);
  return { ...base, ...res };
}

export async function resolvePaymentLinkForProduct(
  productKey: string,
): Promise<{ url: string; checkoutUrl: string; source: "admin" | "catalog" | "empty" }> {
  await ensurePaymentLinkTables();
  const sql = await getSql();
  const key = productKey.trim().toLowerCase();
  const rows = (await sql`
    SELECT payment_link_url FROM product_payment_links WHERE product_key = ${key} LIMIT 1
  `) as Array<{ payment_link_url: string }>;
  const adminUrl = rows[0]?.payment_link_url ?? "";
  const res = resolve(key, adminUrl);
  return {
    url: res.resolvedUrl,
    checkoutUrl: res.resolvedUrl
      ? withStripeClientReference(res.resolvedUrl, key)
      : "",
    source: res.source,
  };
}
