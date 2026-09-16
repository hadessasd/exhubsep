CREATE TABLE IF NOT EXISTS category_showcase_videos (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  label TEXT,
  external_url TEXT,
  file_name TEXT,
  file_mime TEXT,
  file_data TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS category_showcase_videos_cat_idx
  ON category_showcase_videos (category);
