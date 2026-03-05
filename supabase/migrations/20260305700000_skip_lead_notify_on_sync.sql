-- Skip per-row lead notifications for synced leads (source = 'google-sheets')
-- The sync-leads edge function sends a single summary notification instead.

CREATE OR REPLACE FUNCTION public.trg_notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_lead_name TEXT;
BEGIN
  -- Skip bulk-synced leads; the sync function sends a summary notification
  IF NEW.source = 'google-sheets' THEN
    RETURN NEW;
  END IF;

  v_company_id := NEW.company_id;
  IF v_company_id IS NULL THEN RETURN NEW; END IF;

  v_lead_name := COALESCE(NEW.full_name, 'Someone');

  PERFORM public.notify_user(
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
