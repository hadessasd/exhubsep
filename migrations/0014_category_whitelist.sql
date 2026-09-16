-- Software whitelist scopes are category-level (not Standard/Pro/Premium).
-- Remap legacy per-tier product_key values → sat|act|gre|gmat|proctor|general.

UPDATE machine_whitelist SET product_key = 'general'
WHERE product_key IS NULL OR trim(product_key) = '';

UPDATE machine_whitelist SET product_key = 'sat'
WHERE product_key IN ('standard', 'pro', 'premium')
   OR product_key = 'sat'
   OR product_key LIKE 'sat-%'
   OR product_key LIKE 'sat_%';

UPDATE machine_whitelist SET product_key = 'act'
WHERE product_key = 'act' OR product_key LIKE 'act-%' OR product_key LIKE 'act_%';

UPDATE machine_whitelist SET product_key = 'gre'
WHERE product_key = 'gre' OR product_key LIKE 'gre-%' OR product_key LIKE 'gre_%';

UPDATE machine_whitelist SET product_key = 'gmat'
WHERE product_key = 'gmat' OR product_key LIKE 'gmat-%' OR product_key LIKE 'gmat_%';

UPDATE machine_whitelist SET product_key = 'proctor'
WHERE product_key = 'proctor' OR product_key = 'proctoring'
   OR product_key LIKE 'proctor%'
   OR product_key LIKE 'tool-%'
   OR product_key LIKE 'contest-%'
   OR product_key LIKE '%lockdown%'
   OR product_key LIKE '%honorlock%'
   OR product_key LIKE '%proctorio%'
   OR product_key LIKE '%respondus%';

UPDATE machine_whitelist SET product_key = 'general'
WHERE product_key LIKE 'bundle%'
   OR product_key = 'research' OR product_key LIKE 'research%'
   OR product_key = 'internship' OR product_key LIKE 'intern%';

-- Collapse duplicates created by remapping multiple tiers onto one category
DELETE FROM machine_whitelist a
 USING machine_whitelist b
 WHERE a.machine_id_hash IS NOT NULL
   AND a.machine_id_hash = b.machine_id_hash
   AND a.product_key = b.product_key
   AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS machine_whitelist_hash_product_uidx
  ON machine_whitelist (machine_id_hash, product_key)
  WHERE machine_id_hash IS NOT NULL;
