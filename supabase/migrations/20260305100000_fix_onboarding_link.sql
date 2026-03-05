-- Fix onboarding notification deep-link: ?tab=post-job does not exist, use ?tab=jobs
-- Also update the complete_onboarding function for future notifications.

-- 1. Fix existing notification rows
UPDATE public.notifications
SET metadata = jsonb_set(metadata, '{link}', '"/dashboard?tab=jobs"')
WHERE metadata->>'link' = '/dashboard?tab=post-job';

-- 2. Recreate complete_onboarding with corrected link
CREATE OR REPLACE FUNCTION public.complete_onboarding(chosen_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

  SELECT email,
         COALESCE(raw_user_meta_data ->> 'name', raw_user_meta_data ->> 'full_name', split_part(email, '@', 1))
    INTO user_email, full_name
    FROM auth.users
   WHERE id = uid;

  display_name := COALESCE(full_name, 'User');

  UPDATE public.profiles
     SET role = chosen_role,
         needs_onboarding = false,
         name = display_name
   WHERE id = uid;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, name, role, needs_onboarding)
    VALUES (uid, display_name, chosen_role, false)
    ON CONFLICT (id) DO UPDATE
      SET role = EXCLUDED.role,
          needs_onboarding = false,
          name = EXCLUDED.name;
  END IF;

  IF chosen_role = 'driver' THEN
    INSERT INTO public.driver_profiles (id, first_name, last_name)
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
    INSERT INTO public.company_profiles (id, company_name, email, contact_name)
    VALUES (uid, '', user_email, display_name)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  PERFORM public.notify_user(
    uid,
    'welcome',
    'Welcome to CDL Jobs Center!',
    CASE WHEN chosen_role = 'driver'
      THEN 'Your account is set up. Complete your profile to get AI-matched with the best CDL jobs.'
      ELSE 'Your account is set up. Post your first job to start receiving matched candidates.'
    END,
    jsonb_build_object(
      'link', CASE WHEN chosen_role = 'driver'
        THEN '/driver-dashboard?tab=profile'
        ELSE '/dashboard?tab=jobs'
      END
    )
  );
END;
$$;
