-- Machine whitelist / license keys for ExamHub verification
CREATE TABLE IF NOT EXISTS machine_whitelist (
  id TEXT PRIMARY KEY,
  key_name TEXT NOT NULL DEFAULT 'Unnamed Key',
  machine_id_hash TEXT NOT NULL,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS machine_whitelist_hash_uidx
  ON machine_whitelist (machine_id_hash);

CREATE INDEX IF NOT EXISTS machine_whitelist_status_idx
  ON machine_whitelist (status);

CREATE INDEX IF NOT EXISTS machine_whitelist_token_idx
  ON machine_whitelist (session_token);
