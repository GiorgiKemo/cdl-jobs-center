-- Admin INSERT policies for creating users from the admin dashboard
-- The edge function uses SERVICE_ROLE_KEY (bypasses RLS), but these are
-- a safety net for any future direct-from-client operations.

-- Admins can insert profiles
DROP POLICY IF EXISTS "Admins insert profiles" ON profiles;
CREATE POLICY "Admins insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Admins can insert company_profiles
DROP POLICY IF EXISTS "Admins insert company profiles" ON company_profiles;
CREATE POLICY "Admins insert company profiles"
  ON company_profiles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Admins can insert driver_profiles
DROP POLICY IF EXISTS "Admins insert driver profiles" ON driver_profiles;
CREATE POLICY "Admins insert driver profiles"
  ON driver_profiles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Verify United Global Carrier if it exists (may have been added by user registration)
UPDATE company_profiles
SET is_verified = true,
    website = 'https://www.unitedglobalcarrier.com'
WHERE company_name ILIKE '%United Global Carrier%'
  AND (website IS NULL OR website NOT LIKE '%unitedglobalcarrier%');
