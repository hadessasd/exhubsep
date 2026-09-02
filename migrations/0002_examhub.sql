-- ExamHub application schema

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_tier TEXT,
  amount_usd INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  gift_card_key TEXT,
  crypto_currency TEXT,
  crypto_tx_id TEXT,
  contact_method TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  meta_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS research_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  subject TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  quote_usd INTEGER NOT NULL,
  contact_method TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS research_requests_status_idx ON research_requests (status);

CREATE TABLE IF NOT EXISTS internship_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  field TEXT NOT NULL,
  state TEXT NOT NULL,
  weekly_salary_usd INTEGER NOT NULL,
  base_price_usd INTEGER NOT NULL,
  extras_json TEXT NOT NULL DEFAULT '[]',
  preferences TEXT,
  contact_method TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS internship_requests_status_idx ON internship_requests (status);

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  seo_title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  seo_keywords TEXT,
  html_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  author_email TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts (status);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts (slug);

CREATE TABLE IF NOT EXISTS product_seo (
  product_id TEXT PRIMARY KEY,
  seo_title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  seo_keywords TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
