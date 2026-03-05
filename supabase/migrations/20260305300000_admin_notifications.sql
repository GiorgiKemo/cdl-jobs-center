-- ============================================================
-- Admin Notifications
-- Notify all admin users when:
--   1. A new driver or company registers (profile created)
--   2. A new application is submitted
-- ============================================================

-- 1. Add new enum value for admin registration notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_registration';

-- 2. Add default admin notification preferences to new admin profiles
-- (Existing admins will get the default TRUE behavior via COALESCE)

-- 3. Trigger: notify all admins when a new non-admin profile is created
CREATE OR REPLACE FUNCTION public.trg_notify_admin_new_registration()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
  v_name TEXT;
  v_role TEXT;
BEGIN
  -- Skip admin accounts
  IF NEW.role = 'admin' THEN RETURN NEW; END IF;

  -- Skip onboarding users (they haven't picked a role yet, will fire on complete_onboarding)
  IF NEW.needs_onboarding = true THEN RETURN NEW; END IF;

  v_name := COALESCE(NULLIF(NEW.name, ''), 'Unknown');
  v_role := NEW.role;

  FOR v_admin IN
    SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    PERFORM public.notify_user(
      v_admin.id,
      'new_registration',
      'New ' || INITCAP(v_role) || ' Registered',
      v_name || ' just signed up as a ' || v_role || '.',
      jsonb_build_object(
        'member_id', NEW.id,
        'member_name', v_name,
        'member_role', v_role,
        'link', '/admin?tab=users'
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS notify_admin_new_registration ON profiles;
CREATE TRIGGER notify_admin_new_registration
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_admin_new_registration();

-- 4. Also notify admins when onboarding completes (OAuth users who pick their role)
-- Patch complete_onboarding to call admin notification
CREATE OR REPLACE FUNCTION public.notify_admins_new_registration(
  p_user_id UUID,
  p_name TEXT,
  p_role TEXT
)
RETURNS VOID AS $$
DECLARE
  v_admin RECORD;
  v_name TEXT;
BEGIN
  v_name := COALESCE(NULLIF(p_name, ''), 'Unknown');

  FOR v_admin IN
    SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    PERFORM public.notify_user(
      v_admin.id,
      'new_registration',
      'New ' || INITCAP(p_role) || ' Registered',
      v_name || ' just signed up as a ' || p_role || '.',
      jsonb_build_object(
        'member_id', p_user_id,
        'member_name', v_name,
        'member_role', p_role,
        'link', '/admin?tab=users'
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. Trigger: notify all admins when a new application is submitted
CREATE OR REPLACE FUNCTION public.trg_notify_admin_new_application()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
  v_driver_name TEXT;
  v_job_title TEXT;
BEGIN
  -- Get driver name from the application itself
  v_driver_name := COALESCE(
    NULLIF(CONCAT_WS(' ', NEW.first_name, NEW.last_name), ''),
    'A driver'
  );

  -- Get job title
  IF NEW.job_id IS NOT NULL THEN
    SELECT title INTO v_job_title FROM public.jobs WHERE id = NEW.job_id;
  END IF;
  v_job_title := COALESCE(v_job_title, 'General Application');

  FOR v_admin IN
    SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    PERFORM public.notify_user(
      v_admin.id,
      'new_application',
      'New Application Submitted',
      v_driver_name || ' applied for ' || v_job_title || '.',
      jsonb_build_object(
        'driver_name', v_driver_name,
        'job_title', v_job_title,
        'application_id', NEW.id,
        'link', '/admin?tab=applications'
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS notify_admin_new_application ON applications;
CREATE TRIGGER notify_admin_new_application
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_admin_new_application();

-- 6. Patch complete_onboarding to also notify admins (OAuth users who pick role)
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

  -- Welcome notification to the user
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
        ELSE '/dashboard?tab=post-job'
      END
    )
  );

  -- Notify all admins about the new registration
  PERFORM public.notify_admins_new_registration(uid, display_name, chosen_role);
END;
$$;

-- 7. Revoke direct execution from public users
REVOKE EXECUTE ON FUNCTION public.trg_notify_admin_new_registration() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notify_admin_new_application() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_registration(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
