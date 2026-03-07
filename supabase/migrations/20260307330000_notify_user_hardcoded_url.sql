-- Fix: Supabase blocks ALTER DATABASE for custom GUC params.
-- Store the service role key in Supabase Vault (encrypted at rest),
-- then read it from the vault inside notify_user().

-- 1. Store service role key in Vault (idempotent)
DO $$
BEGIN
  -- NOTE: Secret was stored manually via Supabase Dashboard > Vault
  -- (or via the Management API before this migration was committed).
  -- The actual key value is NOT stored in this file for security reasons.
  -- To set it up on a new project, run in SQL Editor:
  --   SELECT vault.create_secret('<service_role_key>', 'service_role_key', '...');
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key'
  ) THEN
    RAISE NOTICE 'service_role_key not found in vault — add it manually via vault.create_secret()';
  END IF;
END $$;

-- 2. Update notify_user() to read the key from Vault
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id    UUID,
  p_type       notification_type,
  p_title      TEXT,
  p_body       TEXT DEFAULT '',
  p_metadata   JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_notif_id     UUID;
  v_service_role TEXT;
BEGIN
  -- Guard: skip if no recipient
  IF p_user_id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO notifications (user_id, type, title, body, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_metadata)
  RETURNING id INTO v_notif_id;

  BEGIN
    -- Read service role key from encrypted Vault (not hardcoded)
    SELECT decrypted_secret INTO v_service_role
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

    IF v_service_role IS NOT NULL THEN
      PERFORM net.http_post(
        url     := 'https://dlhtuqsdooltinqmyrgw.supabase.co/functions/v1/send-notification',
        body    := jsonb_build_object(
          'notification_id', v_notif_id,
          'user_id',         p_user_id,
          'type',            p_type::text,
          'title',           p_title,
          'body',            p_body,
          'metadata',        p_metadata
        ),
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_service_role
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
