-- Add verification_update notification type + trigger for verification status changes

-- 1. Extend notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'verification_update';

-- 2. Add default preference for the new type on existing profiles
UPDATE profiles
SET notification_preferences = notification_preferences || '{"verification_update": true}'::jsonb
WHERE NOT (notification_preferences ? 'verification_update');

-- 3. Trigger: when admin updates verification_requests.status → notify company
CREATE OR REPLACE FUNCTION trg_notify_verification_update()
RETURNS TRIGGER AS $$
DECLARE
  v_company_name TEXT;
BEGIN
  -- Only fire when status actually changes from 'pending'
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF OLD.status != 'pending' THEN RETURN NEW; END IF;

  -- Get company name
  SELECT company_name INTO v_company_name
  FROM company_profiles WHERE id = NEW.company_id;

  IF NEW.status = 'approved' THEN
    PERFORM notify_user(
      NEW.company_id,
      'verification_update',
      'Verification Approved',
      'Your company has been verified! A verified badge is now visible on your profile and job listings.',
      jsonb_build_object(
        'decision', 'approved',
        'company_name', COALESCE(v_company_name, ''),
        'link', '/dashboard'
      )
    );
  ELSIF NEW.status = 'rejected' THEN
    PERFORM notify_user(
      NEW.company_id,
      'verification_update',
      'Verification Not Approved',
      'Your verification request was not approved.' ||
        CASE WHEN NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason != ''
          THEN ' Reason: ' || NEW.rejection_reason
          ELSE ''
        END,
      jsonb_build_object(
        'decision', 'rejected',
        'rejection_reason', COALESCE(NEW.rejection_reason, ''),
        'company_name', COALESCE(v_company_name, ''),
        'link', '/verification'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_verification_update ON verification_requests;
CREATE TRIGGER notify_verification_update
  AFTER UPDATE ON verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_verification_update();
