-- Historical plain-serial migration; superseded by 0009_restore_serial_sha256.sql
ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE machine_whitelist ALTER COLUMN machine_id_hash DROP NOT NULL;

-- Migrate rows where the old code retained the buyer/admin-entered raw serial.
UPDATE machine_whitelist
SET serial_number = UPPER(TRIM(raw_serial_note))
WHERE serial_number IS NULL
  AND raw_serial_note IS NOT NULL
  AND TRIM(raw_serial_note) <> '';

-- machine_id_hash is legacy only; new verification uses serial_number.
DROP INDEX IF EXISTS machine_whitelist_hash_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS machine_whitelist_serial_uidx
  ON machine_whitelist (serial_number)
  WHERE serial_number IS NOT NULL;
