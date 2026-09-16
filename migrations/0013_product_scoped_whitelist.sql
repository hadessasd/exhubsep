-- Per-product whitelist scopes. Legacy rows → general (global) scope.
UPDATE machine_whitelist
SET product_key = 'general'
WHERE product_key IS NULL OR trim(product_key) = '';

ALTER TABLE machine_whitelist
  ALTER COLUMN product_key SET DEFAULT 'general';

-- Same serial may exist on multiple product packages; uniqueness is per (hash, product).
DROP INDEX IF EXISTS machine_whitelist_hash_uidx;
DROP INDEX IF EXISTS machine_whitelist_serial_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS machine_whitelist_hash_product_uidx
  ON machine_whitelist (machine_id_hash, product_key)
  WHERE machine_id_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS machine_whitelist_product_idx
  ON machine_whitelist (product_key);
