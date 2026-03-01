-- ============================================================================
-- Company Profiles RLS — public read for directory, owner write, admin full
-- ============================================================================

-- Enable RLS (idempotent — no-op if already enabled)
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read company profiles for the public directory
DROP POLICY IF EXISTS "Public read company profiles" ON company_profiles;
CREATE POLICY "Public read company profiles"
  ON company_profiles FOR SELECT
  USING (true);

-- Companies can update their own profile
DROP POLICY IF EXISTS "Companies update own profile" ON company_profiles;
CREATE POLICY "Companies update own profile"
  ON company_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Companies can insert their own profile (signup flow)
DROP POLICY IF EXISTS "Companies insert own profile" ON company_profiles;
CREATE POLICY "Companies insert own profile"
  ON company_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Admins can update any company profile (e.g. set is_verified)
DROP POLICY IF EXISTS "Admins update company profiles" ON company_profiles;
CREATE POLICY "Admins update company profiles"
  ON company_profiles FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
