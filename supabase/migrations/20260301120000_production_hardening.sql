-- Remove existing duplicate applications (keep the newest one per driver+job pair)
DELETE FROM applications a
USING applications b
WHERE a.driver_id = b.driver_id
  AND a.job_id = b.job_id
  AND a.id < b.id;

-- Prevent duplicate applications (same driver + same job)
ALTER TABLE applications
  ADD CONSTRAINT applications_driver_job_unique UNIQUE (driver_id, job_id);

-- Block admin role from being set via client-side signUp.
-- The handle_new_user trigger copies role from auth.users metadata into profiles.
-- This ensures only "driver" and "company" are accepted; anything else defaults to "driver".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_role text;
  safe_role text;
BEGIN
  raw_role := NEW.raw_user_meta_data ->> 'role';

  -- Only allow driver or company from signup; block admin escalation
  IF raw_role IN ('driver', 'company') THEN
    safe_role := raw_role;
  ELSE
    safe_role := 'driver';
  END IF;

  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    safe_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
