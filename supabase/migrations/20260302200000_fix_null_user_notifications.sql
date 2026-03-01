-- Fix: notify_user() and trg_notify_new_application() must handle NULL user_id
-- When a "General Application" is inserted with company_id = NULL, the trigger
-- would pass NULL to notify_user(), violating notifications.user_id NOT NULL.

-- 1. Add NULL guard to notify_user()
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

  INSERT INTO notifications (user_id, type, title, body, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_metadata)
  RETURNING id INTO v_notif_id;

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
    NULL;
  END;

  RETURN v_notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add NULL guard to trg_notify_new_application()
CREATE OR REPLACE FUNCTION trg_notify_new_application()
RETURNS TRIGGER AS $$
BEGIN
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
