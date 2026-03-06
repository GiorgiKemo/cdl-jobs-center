-- Fix: email/password signups receive 2 emails simultaneously — the Supabase
-- confirmation email AND the welcome notification email from handle_new_user().
-- The welcome fires because onboarding=false (role known), but email_confirmed_at
-- is still NULL at signup time.
--
-- Solution: skip the welcome notification when the user's email is not yet
-- confirmed. For OAuth users, email_confirmed_at is set immediately so they
-- still get the welcome. For email/password users, the welcome is sent via
-- send_welcome_notification() RPC called from AuthCallback after confirmation.

-- 1. Wrapper RPC so authenticated users can trigger their own welcome notification
CREATE OR REPLACE FUNCTION public.send_welcome_notification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  user_role text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only send if no welcome notification exists yet (prevent duplicates)
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = uid AND type = 'welcome'
  ) THEN
    RETURN;
  END IF;

  SELECT role INTO user_role FROM public.profiles WHERE id = uid;

  PERFORM public.notify_user(
    uid,
    'welcome',
    'Welcome to CDL Jobs Center!',
    CASE WHEN user_role = 'driver'
      THEN 'Your account is set up. Complete your profile to get AI-matched with the best CDL jobs.'
      ELSE 'Your account is set up. Post your first job to start receiving matched candidates.'
    END,
    jsonb_build_object(
      'link', CASE WHEN user_role = 'driver'
        THEN '/driver-dashboard?tab=profile'
        ELSE '/dashboard?tab=jobs'
      END
    )
  );
END;
$$;

-- 2. Updated handle_new_user — skip welcome when email not confirmed
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

    -- Only send welcome notification if email is already confirmed (OAuth users).
    -- Email/password users get their welcome after confirming via AuthCallback.
    IF NEW.email_confirmed_at IS NOT NULL THEN
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
  END IF;

  RETURN NEW;
END;
$$;
