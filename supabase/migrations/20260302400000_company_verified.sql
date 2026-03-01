-- Add is_verified column to company_profiles
-- Only admins can set this to true (via admin dashboard or direct SQL).
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
