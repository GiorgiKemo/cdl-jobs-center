-- Fix driver match notification deep-link: tab=matches -> tab=ai-matches
-- The DriverDashboard only recognises "ai-matches", not "matches".

CREATE OR REPLACE FUNCTION public.trg_notify_driver_match()
RETURNS TRIGGER AS $$
DECLARE
  v_job_title TEXT;
  v_recent BOOLEAN;
BEGIN
  IF NEW.overall_score < 50 THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.driver_id
      AND type = 'new_match'
      AND created_at > NOW() - INTERVAL '30 minutes'
      AND (metadata ->> 'job_id') = NEW.job_id::text
  ) INTO v_recent;
  IF v_recent THEN RETURN NEW; END IF;

  SELECT title INTO v_job_title FROM public.jobs WHERE id = NEW.job_id;

  PERFORM public.notify_user(
    NEW.driver_id,
    'new_match',
    'New Job Match Found',
    'You matched ' || NEW.overall_score || '% with "' || COALESCE(v_job_title, 'a job') || '"',
    jsonb_build_object(
      'job_id', NEW.job_id,
      'score', NEW.overall_score,
      'job_title', v_job_title,
      'link', '/driver-dashboard?tab=ai-matches'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
