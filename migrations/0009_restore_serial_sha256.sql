-- Restore SHA-256 serial verification. New rows store only machine_id_hash.
-- Rows created during the temporary plain-serial schema are backfilled at
-- runtime by whitelist.ts because PostgreSQL has no built-in portable SHA-256
-- function across both Neon and PGLite.
DROP INDEX IF EXISTS machine_whitelist_serial_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS machine_whitelist_hash_uidx
  ON machine_whitelist (machine_id_hash)
  WHERE machine_id_hash IS NOT NULL;
