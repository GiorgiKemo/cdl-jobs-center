-- Fix: handle_new_user was inserting into profiles.email which doesn't exist,
-- causing the trigger to silently fail for all OAuth signups.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_role text;
  safe_role text;
  onboarding boolean;
BEGIN
  raw_role := NEW.raw_user_meta_data ->> 'role';

  IF raw_role IN ('driver', 'company') THEN
    safe_role := raw_role;
    onboarding := false;
  ELSE
    safe_role := 'driver';
    onboarding := true;
  END IF;

  INSERT INTO public.profiles (id, name, role, needs_onboarding)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    ),
    safe_role,
    onboarding
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
