-- ============================================================================
-- Driver Profiles RLS — add INSERT/UPDATE policies (SELECT already exists)
-- ============================================================================

-- Drivers can insert their own profile (signup / first save)
DROP POLICY IF EXISTS "Drivers insert own profile" ON driver_profiles;
CREATE POLICY "Drivers insert own profile"
  ON driver_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Drivers can update their own profile
DROP POLICY IF EXISTS "Drivers update own profile" ON driver_profiles;
CREATE POLICY "Drivers update own profile"
  ON driver_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any driver profile
DROP POLICY IF EXISTS "Admins update driver profiles" ON driver_profiles;
CREATE POLICY "Admins update driver profiles"
  ON driver_profiles FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
