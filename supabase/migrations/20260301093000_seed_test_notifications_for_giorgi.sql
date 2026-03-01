-- Seed QA notifications for Giorgi's test company account.
-- One-time migration to populate the notification center with mixed read/unread rows.

DO $$
DECLARE
  v_user_id UUID := 'b7cadcd6-e622-4c9b-b82a-9ba914d24f88';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
    RAISE NOTICE 'Skipping test notifications: profile % not found', v_user_id;
    RETURN;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, metadata, read, created_at)
  VALUES
    (
      v_user_id,
      'new_application',
      'New Application Received',
      'John Carter applied for Regional Flatbed position',
      '{"link":"/dashboard?tab=applications","application_id":"qa-app-1001"}'::jsonb,
      FALSE,
      now() - interval '2 minutes'
    ),
    (
      v_user_id,
      'new_message',
      'New Message from Smoke Driver',
      'Can you confirm pay package and home time?',
      '{"link":"/dashboard?tab=messages","application_id":"qa-app-1001"}'::jsonb,
      FALSE,
      now() - interval '5 minutes'
    ),
    (
      v_user_id,
      'new_match',
      'New Candidate Match',
      'A candidate matched 91% for OTR Reefer role',
      '{"link":"/dashboard?tab=matches","score":91}'::jsonb,
      FALSE,
      now() - interval '9 minutes'
    ),
    (
      v_user_id,
      'new_lead',
      'New Lead Received',
      'Daniel Perez requested a callback',
      '{"link":"/dashboard?tab=leads","lead_id":"qa-lead-2002"}'::jsonb,
      FALSE,
      now() - interval '12 minutes'
    ),
    (
      v_user_id,
      'stage_change',
      'Application Status Updated',
      'Applicant moved from New to Interview stage',
      '{"link":"/dashboard?tab=applications","old_stage":"new","new_stage":"interview","application_id":"qa-app-1002"}'::jsonb,
      FALSE,
      now() - interval '16 minutes'
    ),
    (
      v_user_id,
      'subscription_event',
      'Subscription Updated',
      'Your Pro plan renewal is scheduled in 3 days',
      '{"link":"/pricing"}'::jsonb,
      TRUE,
      now() - interval '22 minutes'
    ),
    (
      v_user_id,
      'profile_reminder',
      'Profile Reminder',
      'Complete your company profile to improve driver match quality.',
      '{"link":"/dashboard?tab=settings"}'::jsonb,
      TRUE,
      now() - interval '30 minutes'
    ),
    (
      v_user_id,
      'weekly_digest',
      'Weekly Performance Digest',
      'You received 14 new leads and 6 applications this week.',
      '{"link":"/dashboard?tab=analytics"}'::jsonb,
      FALSE,
      now() - interval '45 minutes'
    );
END $$;
