-- Configurable Stripe Payment Links per product/tier + richer delivery assets

CREATE TABLE IF NOT EXISTS product_payment_links (
  product_key TEXT PRIMARY KEY,
  label TEXT,
  exam_family TEXT,
  tier TEXT,
  payment_link_url TEXT NOT NULL DEFAULT '',
  buy_button_id TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_payment_links_exam_idx
  ON product_payment_links (exam_family);

-- Seed GMAT / GRE placeholders (empty URLs — admin pastes live buy.stripe.com links)
INSERT INTO product_payment_links (product_key, label, exam_family, tier, payment_link_url, notes)
VALUES
  ('gmat-standard', 'GMAT Standard', 'gmat', 'standard', '', 'Paste Stripe Payment Link when ready'),
  ('gmat-pro', 'GMAT Pro', 'gmat', 'pro', '', 'Paste Stripe Payment Link when ready'),
  ('gmat-premium', 'GMAT Premium', 'gmat', 'premium', '', 'Paste Stripe Payment Link when ready'),
  ('gre-standard', 'GRE Standard', 'gre', 'standard', '', 'Paste Stripe Payment Link when ready'),
  ('gre-pro', 'GRE Pro', 'gre', 'pro', '', 'Paste Stripe Payment Link when ready'),
  ('gre-premium', 'GRE Premium', 'gre', 'premium', '', 'Paste Stripe Payment Link when ready')
ON CONFLICT (product_key) DO NOTHING;

-- Delivery asset extras: uploaded file blob + buyer-facing instructions
ALTER TABLE delivery_assets ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE delivery_assets ADD COLUMN IF NOT EXISTS file_mime TEXT;
ALTER TABLE delivery_assets ADD COLUMN IF NOT EXISTS file_data TEXT;
ALTER TABLE delivery_assets ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE delivery_assets ADD COLUMN IF NOT EXISTS external_url TEXT;
