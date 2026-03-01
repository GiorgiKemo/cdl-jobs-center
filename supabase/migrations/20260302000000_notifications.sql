-- =============================================================
-- Notifications: table, preferences, triggers, RLS, RPCs
-- =============================================================

-- 1. Notification type enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'new_application',
    'stage_change',
    'new_message',
    'new_match',
    'new_lead',
    'subscription_event',
    'profile_reminder',
    'weekly_digest'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          notification_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  metadata      JSONB NOT NULL DEFAULT '{}',
  read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- 3. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can INSERT (triggers / edge functions use service role)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 4. Notification preferences column on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "new_application": true,
    "stage_change": true,
    "new_message": true,
    "new_match": true,
    "new_lead": true,
    "subscription_event": true,
    "profile_reminder": true,
    "weekly_digest": true
  }';

-- 5. Helper function: insert notification + optionally call Edge Function
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id    UUID,
  p_type       notification_type,
  p_title      TEXT,
  p_body       TEXT DEFAULT '',
  p_metadata   JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_notif_id UUID;
  v_edge_url TEXT;
BEGIN
  -- Guard: skip if no recipient
  IF p_user_id IS NULL THEN RETURN NULL; END IF;

  -- Insert in-app notification
  INSERT INTO notifications (user_id, type, title, body, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_metadata)
  RETURNING id INTO v_notif_id;

  -- Call Edge Function for email (best-effort via pg_net if available)
  BEGIN
    v_edge_url := current_setting('app.settings.supabase_url', true);
    IF v_edge_url IS NOT NULL AND v_edge_url != '' THEN
      PERFORM net.http_post(
        url    := v_edge_url || '/functions/v1/send-notification',
        body   := jsonb_build_object(
          'notification_id', v_notif_id,
          'user_id', p_user_id,
          'type', p_type::text,
          'title', p_title,
          'body', p_body,
          'metadata', p_metadata
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- pg_net not available or URL not set — skip email, in-app still works
    NULL;
  END;

  RETURN v_notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Mark specific notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(p_notif_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE id = ANY(p_notif_ids)
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Mark ALL notifications as read for current user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE user_id = auth.uid()
    AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- T1: New application → notify company
CREATE OR REPLACE FUNCTION trg_notify_new_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip notification for general applications with no company
  IF NEW.company_id IS NULL THEN RETURN NEW; END IF;

  PERFORM notify_user(
    NEW.company_id,
    'new_application',
    'New Application Received',
    COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '') ||
      ' applied for ' || COALESCE(NEW.job_title, 'a position'),
    jsonb_build_object(
      'application_id', NEW.id,
      'driver_name', COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''),
      'job_title', NEW.job_title,
      'link', '/dashboard?tab=applications'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_new_application ON applications;
CREATE TRIGGER notify_new_application
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_new_application();

-- T2: Pipeline stage change → notify driver
CREATE OR REPLACE FUNCTION trg_notify_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    PERFORM notify_user(
      NEW.driver_id,
      'stage_change',
      'Application Status Updated',
      'Your application for ' || COALESCE(NEW.job_title, 'a position') ||
        ' at ' || COALESCE(NEW.company_name, 'a company') ||
        ' moved to "' || NEW.pipeline_stage || '"',
      jsonb_build_object(
        'application_id', NEW.id,
        'old_stage', OLD.pipeline_stage,
        'new_stage', NEW.pipeline_stage,
        'job_title', NEW.job_title,
        'company_name', NEW.company_name,
        'link', '/driver-dashboard?tab=applications'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_stage_change ON applications;
CREATE TRIGGER notify_stage_change
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_stage_change();

-- T3: New message → notify other party (5-min debounce per application)
CREATE OR REPLACE FUNCTION trg_notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_app RECORD;
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_recent_notif_exists BOOLEAN;
BEGIN
  -- Get application info
  SELECT driver_id, company_id, job_title, first_name, last_name, company_name
  INTO v_app
  FROM applications WHERE id = NEW.application_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Determine recipient (the other party)
  IF NEW.sender_role = 'driver' THEN
    v_recipient_id := v_app.company_id;
    v_sender_name := COALESCE(v_app.first_name, '') || ' ' || COALESCE(v_app.last_name, '');
  ELSE
    v_recipient_id := v_app.driver_id;
    v_sender_name := COALESCE(v_app.company_name, 'Company');
  END IF;

  -- 5-minute debounce: skip if a new_message notification exists for this application recently
  SELECT EXISTS(
    SELECT 1 FROM notifications
    WHERE user_id = v_recipient_id
      AND type = 'new_message'
      AND metadata->>'application_id' = NEW.application_id::text
      AND created_at > now() - interval '5 minutes'
  ) INTO v_recent_notif_exists;

  IF v_recent_notif_exists THEN RETURN NEW; END IF;

  PERFORM notify_user(
    v_recipient_id,
    'new_message',
    'New Message from ' || TRIM(v_sender_name),
    LEFT(NEW.body, 100),
    jsonb_build_object(
      'application_id', NEW.application_id,
      'sender_name', TRIM(v_sender_name),
      'link', CASE WHEN NEW.sender_role = 'driver'
        THEN '/dashboard?tab=messages&app=' || NEW.application_id
        ELSE '/driver-dashboard?tab=messages&app=' || NEW.application_id
      END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_new_message ON messages;
CREATE TRIGGER notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_new_message();

-- T4: Driver match score → notify driver (1-hour debounce, score >= 50)
CREATE OR REPLACE FUNCTION trg_notify_driver_match()
RETURNS TRIGGER AS $$
DECLARE
  v_job_title TEXT;
  v_recent BOOLEAN;
BEGIN
  IF NEW.overall_score < 50 THEN RETURN NEW; END IF;

  -- 1-hour debounce per driver
  SELECT EXISTS(
    SELECT 1 FROM notifications
    WHERE user_id = NEW.driver_id
      AND type = 'new_match'
      AND created_at > now() - interval '1 hour'
  ) INTO v_recent;

  IF v_recent THEN RETURN NEW; END IF;

  SELECT title INTO v_job_title FROM jobs WHERE id = NEW.job_id;

  PERFORM notify_user(
    NEW.driver_id,
    'new_match',
    'New Job Match Found',
    'You matched ' || NEW.overall_score || '% with "' || COALESCE(v_job_title, 'a job') || '"',
    jsonb_build_object(
      'job_id', NEW.job_id,
      'score', NEW.overall_score,
      'job_title', v_job_title,
      'link', '/driver-dashboard?tab=matches'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_driver_match ON driver_job_match_scores;
CREATE TRIGGER notify_driver_match
  AFTER INSERT ON driver_job_match_scores
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_driver_match();

-- T5: Company match score → notify company (1-hour debounce)
CREATE OR REPLACE FUNCTION trg_notify_company_match()
RETURNS TRIGGER AS $$
DECLARE
  v_job_title TEXT;
  v_recent BOOLEAN;
BEGIN
  IF NEW.overall_score < 50 THEN RETURN NEW; END IF;

  -- 1-hour debounce per company
  SELECT EXISTS(
    SELECT 1 FROM notifications
    WHERE user_id = NEW.company_id
      AND type = 'new_match'
      AND created_at > now() - interval '1 hour'
  ) INTO v_recent;

  IF v_recent THEN RETURN NEW; END IF;

  SELECT title INTO v_job_title FROM jobs WHERE id = NEW.job_id;

  PERFORM notify_user(
    NEW.company_id,
    'new_match',
    'New Candidate Match',
    'A candidate matched ' || NEW.overall_score || '% for "' || COALESCE(v_job_title, 'a job') || '"',
    jsonb_build_object(
      'job_id', NEW.job_id,
      'score', NEW.overall_score,
      'job_title', v_job_title,
      'link', '/dashboard?tab=matches'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_company_match ON company_driver_match_scores;
CREATE TRIGGER notify_company_match
  AFTER INSERT ON company_driver_match_scores
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_company_match();

-- T6: New lead → notify company
CREATE OR REPLACE FUNCTION trg_notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_lead_name TEXT;
BEGIN
  -- leads table uses full_name (single column)
  v_company_id := NEW.company_id;
  v_lead_name := COALESCE(NEW.full_name, 'Someone');

  PERFORM notify_user(
    v_company_id,
    'new_lead',
    'New Lead Received',
    v_lead_name || ' is interested in your company',
    jsonb_build_object(
      'lead_id', NEW.id,
      'lead_name', v_lead_name,
      'link', '/dashboard?tab=leads'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_new_lead ON leads;
CREATE TRIGGER notify_new_lead
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_new_lead();

-- ================================================================
-- SCHEDULED NOTIFICATIONS (pg_cron)
-- Requires pg_cron extension enabled on the Supabase project.
-- These schedules call the send-scheduled-notifications Edge Function.
-- ================================================================

-- Enable pg_cron if not already enabled
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

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
