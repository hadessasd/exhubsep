-- macOS app redeem: persist approximate location with whitelist rows
ALTER TABLE machine_whitelist ADD COLUMN IF NOT EXISTS approx_location TEXT;
