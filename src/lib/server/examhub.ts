import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware, optionalBearerMiddleware } from "@/lib/auth/middleware";
import { getSessionUser } from "@/lib/auth/verify.server";
import {
  LOCKED_ADMIN_EMAIL,
  isLockedAdminEmail,
} from "@/lib/admin-lock";
import {
  PRODUCTS,
  RESEARCH_BASE_USD,
  RESEARCH_OPTIONS,
  INTERNSHIP_FIELDS,
  INTERNSHIP_EXTRAS,
  estimateWeeklySalary,
  getProductBySlug,
  groupBuyPrice,
  internshipBaseWithCountry,
  getSeoDirectory,
  MAX_ORDERS_PER_USER,
} from "@/lib/data/catalog";
import { uid, slugify } from "@/lib/utils";
import {
  VOUCH_REVIEWS,
  RATING_SEED_COUNT,
  RATING_SEED_AVG,
} from "@/lib/data/vouch-ratings";

const ADMIN_EMAIL = LOCKED_ADMIN_EMAIL;

function isAdminEmail(email: string | null | undefined): boolean {
  return isLockedAdminEmail(email);
}

async function requireAdmin(bearerToken?: string) {
  const user = await getSessionUser(bearerToken);
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Forbidden: admin only");
  }
  if ((user.email ?? "").trim().toLowerCase() !== ADMIN_EMAIL) {
    throw new Error("Forbidden: admin only");
  }
  return user;
}

export type CreateOrderInput = {
  productId: string;
  paymentMethod: "gift_card" | "crypto";
  giftCardKey?: string;
  cryptoCurrency?: "sol" | "usdc" | "eth" | "ltc";
  cryptoTxId?: string;
  cryptoRail?: string;
  contactMethod: string;
  contactValue: string;
  notes?: string;
  groupSize?: number;
  groupContacts?: string;
};

async function notifyUser(opts: {
  userId: string;
  title: string;
  body: string;
  kind?: string;
  href?: string | null;
  orderId?: string | null;
}) {
  const sql = await getSql();
  try {
    await sql`
      INSERT INTO notifications (id, user_id, title, body, kind, href, order_id)
      VALUES (
        ${uid("ntf")},
        ${opts.userId},
        ${opts.title},
        ${opts.body},
        ${opts.kind ?? "info"},
        ${opts.href ?? null},
        ${opts.orderId ?? null}
      )
    `;
  } catch {
    /* table may not exist yet mid-migrate */
  }
}

export const createOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: CreateOrderInput) => input)
  .handler(async ({ context, data }) => {
    const product = getProductBySlug(data.productId);
    if (!product) throw new Error("Product not found");
    if (!data.contactMethod?.trim() || !data.contactValue?.trim()) {
      throw new Error("Contact method and value are required");
    }
    if (data.paymentMethod === "gift_card" && !data.giftCardKey?.trim()) {
      throw new Error("Gift card key is required");
    }
    if (data.paymentMethod === "crypto" && !data.cryptoTxId?.trim()) {
      throw new Error("Transaction ID / payment reference is required");
    }
    const rail = (data.cryptoRail || "onchain").toLowerCase();
    const allowedCoins = ["sol", "usdc", "eth", "ltc"];
    if (
      data.paymentMethod === "crypto" &&
      rail === "onchain" &&
      !allowedCoins.includes(data.cryptoCurrency || "")
    ) {
      throw new Error("Select Solana, USDC, ETH, or Litecoin");
    }
    const sqlPre = await getSql();
    const [active] = await sqlPre`
      SELECT COUNT(*)::int AS c FROM orders
      WHERE user_id = ${context.userId}
        AND status NOT IN ('cancelled', 'closed')
    ` as Array<{ c: number }>;
    if ((active?.c ?? 0) >= MAX_ORDERS_PER_USER) {
      throw new Error(
        `Order limit reached — max ${MAX_ORDERS_PER_USER} open orders per account. Wait for admin to close or cancel one.`,
      );
    }
    const groupSize = Math.max(1, Math.min(20, Math.floor(data.groupSize ?? 1)));
    const pricing = groupBuyPrice(product.priceUsd, groupSize);
    const amountUsd = pricing.total;
    const groupNote =
      groupSize > 1
        ? `Group buy: ${groupSize} people · ${pricing.discountPct}% off · ${pricing.perPerson}/person · total ${amountUsd}${
            data.groupContacts?.trim()
              ? ` · co-buyers: ${data.groupContacts.trim()}`
              : ""
          }`
        : null;
    const notes = [data.notes?.trim(), groupNote].filter(Boolean).join("\n") || null;
    const id = uid("ord");
    const sql = await getSql();
    const meta = JSON.stringify({
      groupSize,
      perPerson: pricing.perPerson,
      discountPct: pricing.discountPct,
      cryptoRail: data.paymentMethod === "crypto" ? rail : null,
    });
    try {
      await sql`
        INSERT INTO orders (
          id, user_id, product_id, product_name, product_tier, amount_usd,
          payment_method, gift_card_key, crypto_currency, crypto_tx_id,
          contact_method, contact_value, notes, status, meta_json, crypto_rail
        ) VALUES (
          ${id},
          ${context.userId},
          ${product.id},
          ${product.name},
          ${product.tier ?? null},
          ${amountUsd},
          ${data.paymentMethod},
          ${data.paymentMethod === "gift_card" ? data.giftCardKey!.trim() : null},
          ${data.paymentMethod === "crypto" ? (data.cryptoCurrency ?? rail) : null},
          ${data.paymentMethod === "crypto" ? data.cryptoTxId!.trim() : null},
          ${data.contactMethod.trim()},
          ${data.contactValue.trim()},
          ${notes},
          ${"pending"},
          ${meta},
          ${data.paymentMethod === "crypto" ? rail : null}
        )
      `;
    } catch {
      // Fallback if migration column not yet applied
      await sql`
        INSERT INTO orders (
          id, user_id, product_id, product_name, product_tier, amount_usd,
          payment_method, gift_card_key, crypto_currency, crypto_tx_id,
          contact_method, contact_value, notes, status, meta_json
        ) VALUES (
          ${id},
          ${context.userId},
          ${product.id},
          ${product.name},
          ${product.tier ?? null},
          ${amountUsd},
          ${data.paymentMethod},
          ${data.paymentMethod === "gift_card" ? data.giftCardKey!.trim() : null},
          ${data.paymentMethod === "crypto" ? (data.cryptoCurrency ?? rail) : null},
          ${data.paymentMethod === "crypto" ? data.cryptoTxId!.trim() : null},
          ${data.contactMethod.trim()},
          ${data.contactValue.trim()},
          ${notes},
          ${"pending"},
          ${meta}
        )
      `;
    }
    await notifyUser({
      userId: context.userId,
      title: "Order submitted",
      body: `${product.name} is pending admin confirmation (${amountUsd} USD).`,
      kind: "order",
      href: "/orders",
      orderId: id,
    });
    return { id, amountUsd, groupSize, discountPct: pricing.discountPct };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      return await sql`
        SELECT id, product_id, product_name, product_tier, amount_usd,
               payment_method,
               CASE WHEN gift_card_key IS NULL OR gift_card_key = '' THEN 0 ELSE 1 END AS has_gift_card,
               crypto_currency, crypto_tx_id,
               contact_method, contact_value, notes, status, created_at, updated_at,
               delivery_links, admin_message, crypto_rail
        FROM orders
        WHERE user_id = ${context.userId}
        ORDER BY created_at DESC
        LIMIT 100
      ` as Array<{
        id: string; product_id: string; product_name: string; product_tier: string | null;
        amount_usd: number; payment_method: string; has_gift_card: number;
        crypto_currency: string | null; crypto_tx_id: string | null; contact_method: string;
        contact_value: string; notes: string | null; status: string; created_at: string; updated_at: string;
        delivery_links: string | null; admin_message: string | null; crypto_rail: string | null;
      }>;
    } catch {
      const rows = await sql`
        SELECT id, product_id, product_name, product_tier, amount_usd,
               payment_method, crypto_currency, crypto_tx_id,
               contact_method, contact_value, notes, status, created_at, updated_at
        FROM orders
        WHERE user_id = ${context.userId}
        ORDER BY created_at DESC
        LIMIT 100
      ` as Array<any>;
      return rows.map((r) => ({
        ...r,
        has_gift_card: 0,
        delivery_links: null,
        admin_message: null,
        crypto_rail: null,
      }));
    }
  });

export const listAllOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    return sql`
      SELECT id, user_id, product_id, product_name, product_tier, amount_usd,
             payment_method, gift_card_key, crypto_currency, crypto_tx_id,
             contact_method, contact_value, notes, status, created_at, updated_at
      FROM orders ORDER BY created_at DESC LIMIT 500
    ` as Promise<Array<{
      id: string; user_id: string; product_id: string; product_name: string;
      product_tier: string | null; amount_usd: number; payment_method: string;
      gift_card_key: string | null; crypto_currency: string | null; crypto_tx_id: string | null;
      contact_method: string; contact_value: string; notes: string | null; status: string;
      created_at: string; updated_at: string;
    }>>;
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    id: string;
    status: string;
    deliveryLinks?: string;
    adminMessage?: string;
  }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    const allowed = ["pending", "paid", "fulfilling", "completed", "cancelled", "closed"];
    if (!allowed.includes(data.status)) throw new Error("Invalid status");
    const sql = await getSql();
    const rows = await sql`SELECT user_id, product_name FROM orders WHERE id = ${data.id} LIMIT 1` as Array<{ user_id: string; product_name: string }>;
    const order = rows[0];
    if (!order) throw new Error("Order not found");
    const closedAt = data.status === "closed" || data.status === "completed" ? new Date().toISOString() : null;
    try {
      await sql`
        UPDATE orders SET
          status = ${data.status},
          updated_at = NOW(),
          delivery_links = COALESCE(${data.deliveryLinks?.trim() || null}, delivery_links),
          admin_message = COALESCE(${data.adminMessage?.trim() || null}, admin_message),
          closed_at = CASE WHEN ${data.status} IN ('closed', 'completed', 'cancelled')
            THEN COALESCE(closed_at, ${closedAt}::timestamptz) ELSE closed_at END
        WHERE id = ${data.id}
      `;
    } catch {
      await sql`UPDATE orders SET status = ${data.status}, updated_at = NOW() WHERE id = ${data.id}`;
    }
    const title =
      data.status === "closed" || data.status === "completed"
        ? "Order completed"
        : data.status === "cancelled"
          ? "Order cancelled"
          : data.status === "paid" || data.status === "fulfilling"
            ? "Order update"
            : "Order status changed";
    const bodyParts = [
      `${order.product_name} is now “${data.status}”.`,
      data.adminMessage?.trim() || "",
      data.deliveryLinks?.trim() ? "File links are ready in your dashboard." : "",
    ].filter(Boolean);
    await notifyUser({
      userId: order.user_id,
      title,
      body: bodyParts.join(" "),
      kind: "order",
      href: "/orders",
      orderId: data.id,
    });
    return { ok: true };
  });

export const fulfillOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    id: string;
    deliveryLinks: string;
    adminMessage?: string;
    closeOffer?: boolean;
  }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    if (!data.deliveryLinks?.trim() && !data.adminMessage?.trim()) {
      throw new Error("Add file links and/or a message for the buyer");
    }
    const status = data.closeOffer === false ? "fulfilling" : "closed";
    const sql = await getSql();
    const rows = await sql`SELECT user_id, product_name FROM orders WHERE id = ${data.id} LIMIT 1` as Array<{ user_id: string; product_name: string }>;
    const order = rows[0];
    if (!order) throw new Error("Order not found");
    const closedAt = status === "closed" ? new Date().toISOString() : null;
    try {
      await sql`
        UPDATE orders SET
          status = ${status},
          updated_at = NOW(),
          delivery_links = ${data.deliveryLinks?.trim() || null},
          admin_message = ${data.adminMessage?.trim() || null},
          closed_at = CASE WHEN ${status} = 'closed' THEN ${closedAt}::timestamptz ELSE closed_at END
        WHERE id = ${data.id}
      `;
    } catch {
      await sql`UPDATE orders SET status = ${status}, updated_at = NOW() WHERE id = ${data.id}`;
    }
    await notifyUser({
      userId: order.user_id,
      title: status === "closed" ? "Order completed — files ready" : "Delivery update",
      body: [
        `${order.product_name}: ${status === "closed" ? "offer closed by admin." : "files sent."}`,
        data.adminMessage?.trim() || "",
        data.deliveryLinks?.trim() ? "Open Dashboard → Orders to view links." : "Admin will contact you.",
      ].filter(Boolean).join(" "),
      kind: "order",
      href: "/orders",
      orderId: data.id,
    });
    return { ok: true, status };
  });

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      return await sql`
        SELECT id, title, body, kind, href, order_id, read_at, created_at
        FROM notifications
        WHERE user_id = ${context.userId}
        ORDER BY created_at DESC
        LIMIT 40
      ` as Array<{
        id: string; title: string; body: string; kind: string;
        href: string | null; order_id: string | null; read_at: string | null; created_at: string;
      }>;
    } catch {
      return [];
    }
  });

export const getUnreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      const [row] = await sql`
        SELECT COUNT(*)::int AS c FROM notifications
        WHERE user_id = ${context.userId} AND read_at IS NULL
      ` as Array<{ c: number }>;
      return { count: row?.c ?? 0 };
    } catch {
      return { count: 0 };
    }
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input?: { ids?: string[] }) => input ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    try {
      if (data.ids?.length) {
        for (const id of data.ids) {
          await sql`
            UPDATE notifications SET read_at = NOW()
            WHERE id = ${id} AND user_id = ${context.userId} AND read_at IS NULL
          `;
        }
      } else {
        await sql`
          UPDATE notifications SET read_at = NOW()
          WHERE user_id = ${context.userId} AND read_at IS NULL
        `;
      }
    } catch { /* ignore */ }
    return { ok: true };
  });

export const getMyOrderSummary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const orders = await sql`
      SELECT id, product_name, status, amount_usd, created_at
      FROM orders
      WHERE user_id = ${context.userId}
        AND status NOT IN ('cancelled', 'closed')
      ORDER BY created_at DESC
      LIMIT 10
    ` as Array<{ id: string; product_name: string; status: string; amount_usd: number; created_at: string }>;
    return {
      openCount: orders.length,
      maxOrders: MAX_ORDERS_PER_USER,
      onlyOrder: orders.length === 1 ? orders[0]! : null,
      orders,
    };
  });

export const submitResearchRequest = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: {
    subject: string; optionIds: string[]; contactMethod: string;
    contactValue: string; notes?: string;
  }) => input)
  .handler(async ({ context, data }) => {
    if (!data.subject?.trim()) throw new Error("Subject required");
    if (!data.contactMethod?.trim() || !data.contactValue?.trim()) throw new Error("Contact required");
    const options = RESEARCH_OPTIONS.filter((o) => data.optionIds.includes(o.id));
    const quote = RESEARCH_BASE_USD + options.reduce((s, o) => s + o.priceUsd, 0);
    const user = await getSessionUser(context?.bearerToken);
    const id = uid("res");
    const sql = await getSql();
    await sql`
      INSERT INTO research_requests (
        id, user_id, subject, options_json, quote_usd, contact_method, contact_value, notes, status
      ) VALUES (
        ${id}, ${user?.id ?? null}, ${data.subject.trim()},
        ${JSON.stringify(options.map((o) => o.id))}, ${quote},
        ${data.contactMethod.trim()}, ${data.contactValue.trim()},
        ${data.notes?.trim() || null}, ${"pending"}
      )
    `;
    return { id, quoteUsd: quote };
  });

export const listResearchRequests = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    return sql`SELECT * FROM research_requests ORDER BY created_at DESC LIMIT 300` as Promise<Array<{
      id: string; user_id: string | null; subject: string; options_json: string;
      quote_usd: number; contact_method: string; contact_value: string;
      notes: string | null; status: string; created_at: string;
    }>>;
  });

export const updateResearchStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    await sql`UPDATE research_requests SET status = ${data.status} WHERE id = ${data.id}`;
    return { ok: true };
  });

export const submitInternshipRequest = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: {
    fieldId: string; state: string; countryId: string; extraIds: string[];
    preferences?: string; contactMethod: string; contactValue: string;
  }) => input)
  .handler(async ({ context, data }) => {
    const field = INTERNSHIP_FIELDS.find((f) => f.id === data.fieldId);
    if (!field) throw new Error("Invalid field");
    if (!data.contactMethod?.trim() || !data.contactValue?.trim()) throw new Error("Contact required");
    const extras = INTERNSHIP_EXTRAS.filter((e) => data.extraIds.includes(e.id));
    const base = internshipBaseWithCountry(data.fieldId, data.countryId || "us");
    const extrasTotal = extras.reduce((s, e) => s + e.priceUsd, 0);
    const salary = estimateWeeklySalary(data.fieldId, data.state || "Remote / Any state", data.countryId || "us");
    const user = await getSessionUser(context?.bearerToken);
    const id = uid("int");
    const sql = await getSql();
    await sql`
      INSERT INTO internship_requests (
        id, user_id, field, state, weekly_salary_usd, base_price_usd,
        extras_json, preferences, contact_method, contact_value, status
      ) VALUES (
        ${id}, ${user?.id ?? null}, ${field.label},
        ${`${data.countryId || "us"} · ${data.state || "n/a"}`},
        ${salary.mid}, ${base + extrasTotal},
        ${JSON.stringify(extras.map((e) => e.id))},
        ${data.preferences?.trim() || null},
        ${data.contactMethod.trim()}, ${data.contactValue.trim()}, ${"pending"}
      )
    `;
    return {
      id,
      quoteUsd: base + extrasTotal,
      totalUsd: base + extrasTotal,
      weeklySalaryMid: salary.mid,
      weeklySalary: salary,
      weeklyRange: salary,
    };
  });

export const listInternshipRequests = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    return sql`SELECT * FROM internship_requests ORDER BY created_at DESC LIMIT 300` as Promise<Array<{
      id: string; user_id: string | null; field: string; state: string;
      weekly_salary_usd: number; base_price_usd: number; extras_json: string;
      preferences: string | null; contact_method: string; contact_value: string;
      status: string; created_at: string;
    }>>;
  });

export const updateInternshipStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    await sql`UPDATE internship_requests SET status = ${data.status} WHERE id = ${data.id}`;
    return { ok: true };
  });

export const listBlogPosts = createServerFn({ method: "GET" })
  .middleware([optionalBearerMiddleware])
  .validator((input?: { all?: boolean }) => input ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.all) {
      const user = await getSessionUser(context?.bearerToken);
      if (!user || !isAdminEmail(user.email)) throw new Error("Forbidden");
      return sql`SELECT * FROM blog_posts ORDER BY updated_at DESC LIMIT 200` as Promise<Array<any>>;
    }
    return sql`
      SELECT * FROM blog_posts WHERE status = 'published'
      ORDER BY published_at DESC NULLS LAST, created_at DESC LIMIT 100
    ` as Promise<Array<any>>;
  });

async function loadBlogPost(slug: string) {
  const sql = await getSql();
  const rows = await sql`
    SELECT * FROM blog_posts WHERE slug = ${slug} LIMIT 1
  ` as Array<any>;
  const post = rows[0];
  if (!post) return null;
  if (post.status !== "published") {
    const user = await getSessionUser();
    if (!user || !isAdminEmail(user.email)) return null;
  }
  return post as {
    id: string; slug: string; title: string; seo_title: string;
    seo_description: string; seo_keywords: string | null; html_content: string;
    status: string; author_email: string | null; published_at: string | null; created_at: string;
  };
}

export const getBlogPostBySlug = createServerFn({ method: "GET" })
  .validator((input: { slug: string } | string) =>
    typeof input === "string" ? { slug: input } : input,
  )
  .handler(async ({ data }) => loadBlogPost(data.slug));

export const getBlogPost = createServerFn({ method: "GET" })
  .validator((input: { slug: string } | string) =>
    typeof input === "string" ? { slug: input } : input,
  )
  .handler(async ({ data }) => loadBlogPost(data.slug));

export const saveBlogPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    id?: string; title: string; seoTitle: string; seoDescription: string;
    seoKeywords?: string; htmlContent: string; status: "draft" | "published"; slug?: string;
  }) => input)
  .handler(async ({ context, data }) => {
    const admin = await requireAdmin(context?.bearerToken);
    if (!data.title?.trim() || !data.htmlContent?.trim()) throw new Error("Title and HTML content required");
    const sql = await getSql();
    const slug = data.slug?.trim() || slugify(data.title) + "-" + Math.random().toString(36).slice(2, 6);
    const seoTitle = data.seoTitle?.trim() || data.title.trim();
    const seoDesc = data.seoDescription?.trim() || data.title.trim().slice(0, 150);
    const publishedAt = data.status === "published" ? new Date().toISOString() : null;
    if (data.id) {
      await sql`
        UPDATE blog_posts SET
          title = ${data.title.trim()}, slug = ${slug}, seo_title = ${seoTitle},
          seo_description = ${seoDesc}, seo_keywords = ${data.seoKeywords?.trim() || null},
          html_content = ${data.htmlContent}, status = ${data.status},
          author_email = ${admin.email},
          published_at = COALESCE(published_at, ${publishedAt}::timestamptz),
          updated_at = NOW()
        WHERE id = ${data.id}
      `;
      return { id: data.id, slug };
    }
    const id = uid("post");
    await sql`
      INSERT INTO blog_posts (
        id, slug, title, seo_title, seo_description, seo_keywords,
        html_content, status, author_email, published_at
      ) VALUES (
        ${id}, ${slug}, ${data.title.trim()}, ${seoTitle}, ${seoDesc},
        ${data.seoKeywords?.trim() || null}, ${data.htmlContent}, ${data.status},
        ${admin.email}, ${publishedAt}
      )
    `;
    return { id, slug };
  });

export const deleteBlogPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    await sql`DELETE FROM blog_posts WHERE id = ${data.id}`;
    return { ok: true };
  });

export const generateSeoForProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { productId: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    const product = getProductBySlug(data.productId);
    if (!product) throw new Error("Product not found");
    const year = new Date().getFullYear();
    const seoTitle = `${product.name} $${product.priceUsd} | Buy Online — ExamHub ${year}`.slice(0, 70);
    const seoDescription = `${product.shortDescription} Order ${product.name} for $${product.priceUsd}. Gift card & crypto checkout. US, UK, Europe. ExamHub ${year}.`.slice(0, 160);
    const seoKeywords = [product.name, ...product.seoKeywords, "buy online", "exam prep", String(year)].join(", ");
    const sql = await getSql();
    await sql`
      INSERT INTO product_seo (product_id, seo_title, seo_description, seo_keywords, updated_at)
      VALUES (${product.id}, ${seoTitle}, ${seoDescription}, ${seoKeywords}, NOW())
      ON CONFLICT (product_id) DO UPDATE SET
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW()
    `;
    return { seoTitle, seoDescription, seoKeywords };
  });

export const generateBlogWithAi = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { topic: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    const topic = data.topic?.trim() || "Exam prep tips";
    const year = new Date().getFullYear();
    const title = `${topic}: Complete Guide for Students (${year})`;
    const seoTitle = `${topic} Guide ${year} | ExamHub Blog`.slice(0, 70);
    const seoDescription = `Learn ${topic} with ExamHub. Practical strategies, tool comparisons, and student-focused advice for ${year}.`.slice(0, 160);
    const htmlContent = `<article><h2>${topic}: what students need to know in ${year}</h2><p>ExamHub helps students prepare for high-stakes exams. This guide covers <strong>${topic}</strong>.</p><h3>Key takeaways</h3><ul><li>Start early and practice under timed conditions</li><li>Match tools to your exam environment</li><li>Track progress weekly</li></ul><p><em>Published on ExamHub.</em></p></article>`;
    return {
      title, seoTitle, seoDescription,
      seoKeywords: `${topic}, exam prep, ExamHub, SAT, ACT, proctoring, ${year}`,
      htmlContent,
    };
  });

export const startChatThread = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: {
    visitorName: string; contactMethod: string; contactValue: string; firstMessage: string;
  }) => input)
  .handler(async ({ context, data }) => {
    if (!data.visitorName?.trim() || !data.contactValue?.trim()) throw new Error("Name and contact required");
    if (!data.firstMessage?.trim()) throw new Error("Message required");
    const user = await getSessionUser(context?.bearerToken);
    const threadId = uid("chat");
    const msgId = uid("msg");
    const sql = await getSql();
    await sql`
      INSERT INTO chat_threads (id, user_id, visitor_name, contact_method, contact_value, status)
      VALUES (${threadId}, ${user?.id ?? null}, ${data.visitorName.trim()},
        ${data.contactMethod.trim() || "discord"}, ${data.contactValue.trim()}, ${"open"})
    `;
    await sql`INSERT INTO chat_messages (id, thread_id, sender, body) VALUES (${msgId}, ${threadId}, ${"visitor"}, ${data.firstMessage.trim()})`;
    await sql`INSERT INTO chat_messages (id, thread_id, sender, body) VALUES (${uid("msg")}, ${threadId}, ${"system"}, ${"Thanks for reaching ExamHub Support (24/7). An admin will reply here shortly. You can also Discord @minjunio."})`;
    return { threadId };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { threadId: string; body: string; asAdmin?: boolean }) => input)
  .handler(async ({ context, data }) => {
    if (!data.threadId || !data.body?.trim()) throw new Error("Message required");
    const sql = await getSql();
    const threads = await sql`SELECT id, user_id FROM chat_threads WHERE id = ${data.threadId} LIMIT 1` as Array<{ id: string; user_id: string | null }>;
    if (!threads[0]) throw new Error("Thread not found");
    let sender = "visitor";
    if (data.asAdmin) { await requireAdmin(context?.bearerToken); sender = "admin"; }
    else { const user = await getSessionUser(context?.bearerToken); if (user) sender = "user"; }
    const id = uid("msg");
    await sql`INSERT INTO chat_messages (id, thread_id, sender, body) VALUES (${id}, ${data.threadId}, ${sender}, ${data.body.trim()})`;
    await sql`UPDATE chat_threads SET updated_at = NOW() WHERE id = ${data.threadId}`;
    return { id };
  });

export const listChatMessages = createServerFn({ method: "GET" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { threadId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    return sql`
      SELECT id, thread_id, sender, body, created_at FROM chat_messages
      WHERE thread_id = ${data.threadId} ORDER BY created_at ASC LIMIT 500
    ` as Promise<Array<{ id: string; thread_id: string; sender: string; body: string; created_at: string }>>;
  });

export const listMyChatThreads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql`
      SELECT id, visitor_name, status, updated_at FROM chat_threads
      WHERE user_id = ${context.userId} ORDER BY updated_at DESC LIMIT 20
    ` as Promise<Array<{ id: string; visitor_name: string | null; status: string; updated_at: string }>>;
  });

export const listAllChatThreads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    return sql`
      SELECT t.id, t.user_id, t.visitor_name, t.contact_method, t.contact_value,
             t.status, t.created_at, t.updated_at,
             (SELECT m.body FROM chat_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_body
      FROM chat_threads t ORDER BY t.updated_at DESC LIMIT 200
    ` as Promise<Array<any>>;
  });

export const closeChatThread = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadId: string; status: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    await sql`UPDATE chat_threads SET status = ${data.status}, updated_at = NOW() WHERE id = ${data.threadId}`;
    return { ok: true };
  });

const RATING_SEED_SUM = RATING_SEED_COUNT * RATING_SEED_AVG;

export type PublicRating = {
  id: string;
  display_name: string;
  stars: number;
  comment: string | null;
  service: string;
  created_at: string;
  verified?: boolean;
  location?: string;
};

export const getPublicRatings = createServerFn({ method: "GET" }).handler(async () => {
  const vouchAsRecent: PublicRating[] = VOUCH_REVIEWS.map((v) => ({
    id: v.id,
    display_name: v.display_name,
    stars: v.stars,
    comment: v.comment,
    service: v.service,
    created_at: v.created_at,
    verified: true,
    location: v.location,
  }));
  try {
    const sql = await getSql();
    const agg = await sql`SELECT COUNT(*)::int AS c, COALESCE(SUM(stars), 0)::float AS s FROM service_ratings WHERE status = 'published'` as Array<{ c: number; s: number }>;
    const dbRecent = await sql`
      SELECT id, display_name, stars, comment, service, created_at FROM service_ratings
      WHERE status = 'published' ORDER BY created_at DESC LIMIT 12
    ` as Array<{ id: string; display_name: string; stars: number; comment: string | null; service: string; created_at: string }>;
    const extraCount = agg[0]?.c ?? 0;
    const extraSum = Number(agg[0]?.s ?? 0);
    const totalCount = RATING_SEED_COUNT + extraCount;
    const totalSum = RATING_SEED_SUM + extraSum;
    const average = totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : RATING_SEED_AVG;
    const mapped: PublicRating[] = dbRecent.map((r) => ({
      ...r,
      verified: true,
    }));
    // User reviews first, then green vouch cards
    const ids = new Set(mapped.map((r) => r.id));
    const recent = [
      ...mapped,
      ...vouchAsRecent.filter((v) => !ids.has(v.id)),
    ].slice(0, 12);
    return {
      average,
      count: totalCount,
      seedCount: RATING_SEED_COUNT,
      seedAverage: RATING_SEED_AVG,
      recent,
    };
  } catch {
    return {
      average: RATING_SEED_AVG,
      count: RATING_SEED_COUNT,
      seedCount: RATING_SEED_COUNT,
      seedAverage: RATING_SEED_AVG,
      recent: vouchAsRecent,
    };
  }
});

export const submitRating = createServerFn({ method: "POST" })
  .middleware([optionalBearerMiddleware])
  .validator((input: { displayName: string; stars: number; comment?: string; service?: string }) => input)
  .handler(async ({ context, data }) => {
    const name = data.displayName?.trim();
    if (!name || name.length < 2) throw new Error("Name required");
    const stars = Math.round(Number(data.stars));
    if (stars < 1 || stars > 5) throw new Error("Stars must be 1–5");
    const user = await getSessionUser(context?.bearerToken);
    const id = uid("rate");
    const sql = await getSql();
    await sql`
      INSERT INTO service_ratings (id, user_id, display_name, stars, comment, service, status)
      VALUES (${id}, ${user?.id ?? null}, ${name.slice(0, 80)}, ${stars},
        ${data.comment?.trim()?.slice(0, 800) || null},
        ${(data.service?.trim() || "overall").slice(0, 60)}, ${"pending"})
    `;
    return { id, status: "pending" as const };
  });

export const listAdminRatings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    return sql`
      SELECT id, user_id, display_name, stars, comment, service, status, created_at
      FROM service_ratings
      ORDER BY
        CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT 400
    ` as Promise<
      Array<{
        id: string;
        user_id: string | null;
        display_name: string;
        stars: number;
        comment: string | null;
        service: string;
        status: string;
        created_at: string;
      }>
    >;
  });

export const updateRatingStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: "published" | "rejected" | "pending" }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    await sql`UPDATE service_ratings SET status = ${data.status} WHERE id = ${data.id}`;
    return { ok: true };
  });

export const deleteRating = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    await sql`DELETE FROM service_ratings WHERE id = ${data.id}`;
    return { ok: true };
  });

export const SELLER_TOS_TEXT = `ExamHub Seller Terms

By applying to become a seller on ExamHub you agree that:

1. You will only submit good, well-built software and legitimate educational tools.
2. You will not dox, harass, or expose private information of any person.
3. You will not provide unsafe methods, malware, phishing, or anything that harms users or institutions.
4. You will grant ExamHub access to your product source code for security review and fulfillment support.
5. ExamHub may reject, suspend, or remove any listing at any time.
6. You are responsible for legal compliance in every region you serve.

Admin contact is fixed to the ExamHub owner and cannot be changed by applicants.`;

export const submitSellerApplication = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    fullName: string; contactMethod: string; contactValue: string;
    productName: string; productDescription: string; sourceAccessNote: string; agreedTos: boolean;
  }) => input)
  .handler(async ({ context, data }) => {
    if (!data.agreedTos) throw new Error("You must agree to the seller Terms of Service");
    if (!data.fullName?.trim() || !data.productName?.trim()) throw new Error("Name and product name required");
    if (!data.contactMethod?.trim() || !data.contactValue?.trim()) throw new Error("Contact required");
    if (!data.productDescription?.trim() || data.productDescription.trim().length < 40) throw new Error("Describe your product in at least 40 characters");
    if (!data.sourceAccessNote?.trim()) throw new Error("Explain how you will grant source code access");
    const id = uid("sell");
    const sql = await getSql();
    await sql`
      INSERT INTO seller_applications (
        id, user_id, full_name, contact_method, contact_value,
        product_name, product_description, source_access_note, agreed_tos, status
      ) VALUES (
        ${id}, ${context.userId}, ${data.fullName.trim().slice(0, 120)},
        ${data.contactMethod.trim()}, ${data.contactValue.trim()},
        ${data.productName.trim().slice(0, 160)}, ${data.productDescription.trim().slice(0, 4000)},
        ${data.sourceAccessNote.trim().slice(0, 2000)}, ${true}, ${"pending"}
      )
    `;
    return { id };
  });

export const listMySellerApplications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql`
      SELECT id, product_name, status, created_at, admin_notes FROM seller_applications
      WHERE user_id = ${context.userId} ORDER BY created_at DESC LIMIT 50
    ` as Promise<Array<{ id: string; product_name: string; status: string; created_at: string; admin_notes: string | null }>>;
  });

export const listSellerApplications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    return sql`SELECT * FROM seller_applications ORDER BY created_at DESC LIMIT 300` as Promise<Array<any>>;
  });

export const updateSellerApplicationStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: string; adminNotes?: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context?.bearerToken);
    const allowed = ["pending", "reviewing", "approved", "rejected"];
    if (!allowed.includes(data.status)) throw new Error("Invalid status");
    const sql = await getSql();
    await sql`
      UPDATE seller_applications
      SET status = ${data.status}, admin_notes = ${data.adminNotes?.trim() || null}, updated_at = NOW()
      WHERE id = ${data.id}
    `;
    return { ok: true };
  });

export const getSeoDirectoryForAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context?.bearerToken);
    return getSeoDirectory();
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context?.bearerToken);
    const sql = await getSql();
    const [orders] = await sql`SELECT COUNT(*)::int AS c FROM orders` as Array<{ c: number }>;
    const [pending] = await sql`SELECT COUNT(*)::int AS c FROM orders WHERE status = 'pending'` as Array<{ c: number }>;
    const [research] = await sql`SELECT COUNT(*)::int AS c FROM research_requests WHERE status = 'pending'` as Array<{ c: number }>;
    const [interns] = await sql`SELECT COUNT(*)::int AS c FROM internship_requests WHERE status = 'pending'` as Array<{ c: number }>;
    const [posts] = await sql`SELECT COUNT(*)::int AS c FROM blog_posts` as Array<{ c: number }>;
    const [chats] = await sql`SELECT COUNT(*)::int AS c FROM chat_threads WHERE status = 'open'` as Array<{ c: number }>;
    let sellers = 0;
    try {
      const [s] = await sql`SELECT COUNT(*)::int AS c FROM seller_applications WHERE status = 'pending'` as Array<{ c: number }>;
      sellers = s?.c ?? 0;
    } catch { sellers = 0; }
    return {
      orders: orders?.c ?? 0,
      pendingOrders: pending?.c ?? 0,
      pendingResearch: research?.c ?? 0,
      pendingInternships: interns?.c ?? 0,
      posts: posts?.c ?? 0,
      openChats: chats?.c ?? 0,
      pendingSellers: sellers,
      productCount: PRODUCTS.length,
    };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([optionalBearerMiddleware])
  .handler(async ({ context }) => {
    const user = await getSessionUser(context?.bearerToken);
    return {
      isAdmin: !!user && isAdminEmail(user.email),
      email: user?.email ?? null,
      lockedAdminEmail: ADMIN_EMAIL,
    };
  });

export { isAdminEmail, ADMIN_EMAIL, PRODUCTS };
