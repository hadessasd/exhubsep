-- Order fulfillment fields + notifications

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_links TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_message TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS crypto_rail TEXT;

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info',
  href TEXT,
  order_id TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at DESC);
