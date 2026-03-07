-- ============================================================
-- Schedule sync-leads to run every 30 minutes via pg_cron.
-- No auth header needed — function allows cron path (empty token).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

DO $$
DECLARE
  v_job_id INT;
BEGIN
  -- Remove existing job if any
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'sync-leads-every-30min';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'sync-leads-every-30min',
    '*/30 * * * *',
    $cmd$
    WITH cfg AS (
      SELECT NULLIF(MAX(CASE WHEN key = 'supabase_url' THEN value END), '') AS supabase_url
      FROM public.app_config
    )
    SELECT net.http_post(
      url     := cfg.supabase_url || '/functions/v1/sync-leads',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := '{}'::jsonb
    )
    FROM cfg
    WHERE cfg.supabase_url IS NOT NULL;
    $cmd$
  );
END;
$$;
