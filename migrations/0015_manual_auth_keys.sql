-- Admin/Stripe auth keys live on machine_whitelist.session_token.
-- Keys stay valid until revoked (status=blocked, token cleared) or expired.
-- No serial required for client authorize (POST /api/whitelist/verify|activate).
-- Unique (hash, product_key) remains partial WHERE machine_id_hash IS NOT NULL.

CREATE INDEX IF NOT EXISTS machine_whitelist_admin_pending_idx
  ON machine_whitelist (source, product_key)
  WHERE source = 'admin' AND session_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS machine_whitelist_token_active_idx
  ON machine_whitelist (session_token)
  WHERE session_token IS NOT NULL AND status = 'active';
