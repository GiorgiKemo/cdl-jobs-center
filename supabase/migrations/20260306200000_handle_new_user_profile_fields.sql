-- handle_new_user: also create driver_profiles/company_profiles rows
-- using metadata from the sign-up form (first_name, last_name, phone,
-- company_name, contact_name). This ensures profile fields are saved
-- immediately at registration, not just via deferred client-side logic.

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
  display_name text;
  meta jsonb;
BEGIN
  meta := NEW.raw_user_meta_data;
  raw_role := meta ->> 'role';

  IF raw_role IN ('driver', 'company') THEN
    safe_role := raw_role;
    onboarding := false;
  ELSE
    safe_role := 'driver';
    onboarding := true;
  END IF;

  display_name := COALESCE(
    meta ->> 'name',
    meta ->> 'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, name, role, email, needs_onboarding)
  VALUES (NEW.id, display_name, safe_role, NEW.email, onboarding)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
  WHERE public.profiles.email IS NULL;

  -- Create role-specific profile rows with signup metadata
  IF NOT onboarding THEN
    IF safe_role = 'driver' THEN
      INSERT INTO public.driver_profiles (id, first_name, last_name, phone)
      VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(meta ->> 'first_name'), ''), split_part(display_name, ' ', 1)),
        COALESCE(NULLIF(TRIM(meta ->> 'last_name'), ''),
          CASE WHEN position(' ' IN display_name) > 0
               THEN substring(display_name FROM position(' ' IN display_name) + 1)
               ELSE ''
          END
        ),
        COALESCE(NULLIF(TRIM(meta ->> 'phone'), ''), '')
      )
      ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO public.company_profiles (id, company_name, email, contact_name, phone)
      VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(meta ->> 'company_name'), ''), ''),
        NEW.email,
        COALESCE(NULLIF(TRIM(meta ->> 'contact_name'), ''), display_name),
        COALESCE(NULLIF(TRIM(meta ->> 'phone'), ''), '')
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;

    PERFORM public.notify_user(
      NEW.id,
      'welcome',
      'Welcome to CDL Jobs Center!',
      CASE WHEN safe_role = 'driver'
        THEN 'Your account is set up. Complete your profile to get AI-matched with the best CDL jobs.'
        ELSE 'Your account is set up. Post your first job to start receiving matched candidates.'
      END,
      jsonb_build_object(
        'link', CASE WHEN safe_role = 'driver'
          THEN '/driver-dashboard?tab=profile'
          ELSE '/dashboard?tab=jobs'
        END
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
