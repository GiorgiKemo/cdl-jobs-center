-- Fix: leads table uses full_name (not first_name + last_name)
CREATE OR REPLACE FUNCTION trg_notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_lead_name TEXT;
BEGIN
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
