-- Ratings + seller applications

CREATE TABLE IF NOT EXISTS service_ratings (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  display_name TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  service TEXT NOT NULL DEFAULT 'overall',
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS service_ratings_status_idx ON service_ratings (status);
CREATE INDEX IF NOT EXISTS service_ratings_created_at_idx ON service_ratings (created_at DESC);

CREATE TABLE IF NOT EXISTS seller_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  full_name TEXT NOT NULL,
  contact_method TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT NOT NULL,
  source_access_note TEXT NOT NULL,
  agreed_tos BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seller_applications_status_idx ON seller_applications (status);
CREATE INDEX IF NOT EXISTS seller_applications_user_id_idx ON seller_applications (user_id);
