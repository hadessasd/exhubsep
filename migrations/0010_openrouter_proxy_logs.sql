CREATE TABLE IF NOT EXISTS openrouter_proxy_logs (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_ip TEXT,
  request_body TEXT NOT NULL,
  api_key_hint TEXT,
  upstream_status INTEGER,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  duration_ms INTEGER,
  error_text TEXT
);
CREATE INDEX IF NOT EXISTS openrouter_proxy_logs_created_idx
  ON openrouter_proxy_logs (created_at DESC);
