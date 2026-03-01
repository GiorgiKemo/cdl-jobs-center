-- =============================================================
-- Notification fixes: DELETE policy, welcome trigger, pg_cron
-- =============================================================

-- 1. RLS DELETE policy — let users delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Add 'welcome' to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'welcome';

-- 3. Welcome notification trigger — fires when a new profile is created
CREATE OR REPLACE FUNCTION trg_notify_welcome()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_user(
    NEW.id,
    'welcome',
    'Welcome to CDL Jobs Center!',
    CASE WHEN NEW.role = 'driver'
      THEN 'Your account is set up. Complete your profile to get AI-matched with the best CDL jobs.'
      ELSE 'Your account is set up. Post your first job to start receiving matched candidates.'
    END,
    jsonb_build_object(
      'link', CASE WHEN NEW.role = 'driver'
        THEN '/driver-dashboard?tab=profile'
        ELSE '/dashboard?tab=post-job'
      END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_welcome ON profiles;
CREATE TRIGGER notify_welcome
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_welcome();

-- 4. pg_cron scheduled notifications
-- Requires: pg_cron + pg_net extensions enabled on the project.
-- Uncomment the lines below in Supabase SQL Editor after enabling pg_cron.

-- Weekly digest: Monday 8:00 AM CT (14:00 UTC)
-- SELECT cron.schedule(
--   'weekly-digest',
--   '0 14 * * 1',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/send-scheduled-notifications',
--     body := '{"task":"weekly_digest"}'::jsonb,
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     )
--   );$$
-- );

-- Profile completion reminder: daily 10:00 AM CT (16:00 UTC)
-- SELECT cron.schedule(
--   'profile-reminder',
--   '0 16 * * *',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/send-scheduled-notifications',
--     body := '{"task":"profile_reminder"}'::jsonb,
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     )
--   );$$
-- );

-- Lead quota warning: daily 9:00 AM CT (15:00 UTC)
-- SELECT cron.schedule(
--   'lead-quota-warning',
--   '0 15 * * *',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/send-scheduled-notifications',
--     body := '{"task":"lead_quota"}'::jsonb,
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     )
--   );$$
-- );
