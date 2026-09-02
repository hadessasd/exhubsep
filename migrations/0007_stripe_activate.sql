-- Stripe payments + post-purchase activation
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
);

CREATE INDEX IF NOT EXISTS stripe_payments_product_idx ON stripe_payments (product_key);
CREATE INDEX IF NOT EXISTS stripe_payments_email_idx ON stripe_payments (customer_email);

-- Research / internship progress trackers (public link)
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
);

CREATE INDEX IF NOT EXISTS service_projects_kind_idx ON service_projects (kind);

-- Admin-managed delivery: bypass files / proctor steps
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
);

-- Extra columns on machine whitelist for paid activations
ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS product_key TEXT;
ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS raw_serial_note TEXT;
