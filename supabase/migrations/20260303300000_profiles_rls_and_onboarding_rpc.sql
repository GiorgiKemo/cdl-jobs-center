-- Fix: profiles table has no UPDATE policy, so the Onboarding page's
-- profiles.update() call is silently blocked by RLS.
-- Also add a SECURITY DEFINER RPC for onboarding so it works regardless of RLS.

-- ── 1. Ensure RLS is enabled on profiles ────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ── 2. Add missing RLS policies on profiles ─────────────────────────────────

-- Users can read their own profile
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile (role, name, needs_onboarding)
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can read all profiles
DROP POLICY IF EXISTS "Admins read all profiles" ON profiles;
CREATE POLICY "Admins read all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update all profiles
DROP POLICY IF EXISTS "Admins update all profiles" ON profiles;
CREATE POLICY "Admins update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ── 3. SECURITY DEFINER RPC for onboarding ──────────────────────────────────
-- Bypasses RLS entirely. Called from the Onboarding page after social login.
-- Creates the driver/company extended profile row too.

CREATE OR REPLACE FUNCTION public.complete_onboarding(chosen_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  display_name text;
  user_email text;
  full_name text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF chosen_role NOT IN ('driver', 'company') THEN
    RAISE EXCEPTION 'Invalid role: %', chosen_role;
  END IF;

  -- Get user info from auth.users
  SELECT email,
         COALESCE(raw_user_meta_data ->> 'name', raw_user_meta_data ->> 'full_name', split_part(email, '@', 1))
    INTO user_email, full_name
    FROM auth.users
   WHERE id = uid;

  display_name := COALESCE(full_name, 'User');

  -- Update profiles row (created by handle_new_user trigger)
  UPDATE profiles
     SET role = chosen_role,
         needs_onboarding = false,
         name = display_name
   WHERE id = uid;

  -- If no profiles row exists yet, create it
  IF NOT FOUND THEN
    INSERT INTO profiles (id, name, role, needs_onboarding)
    VALUES (uid, display_name, chosen_role, false)
    ON CONFLICT (id) DO UPDATE
      SET role = EXCLUDED.role,
          needs_onboarding = false,
          name = EXCLUDED.name;
  END IF;

  -- Create extended profile row
  IF chosen_role = 'driver' THEN
    INSERT INTO driver_profiles (id, first_name, last_name)
    VALUES (
      uid,
      split_part(display_name, ' ', 1),
      CASE WHEN position(' ' IN display_name) > 0
           THEN substring(display_name FROM position(' ' IN display_name) + 1)
           ELSE ''
      END
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO company_profiles (id, company_name, email, contact_name)
    VALUES (uid, '', user_email, display_name)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;
