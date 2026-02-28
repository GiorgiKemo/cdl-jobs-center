-- =============================================================
-- AI Matching v2: feedback/events + driver match metadata
-- =============================================================

-- Extend driver match score row with explainability/action fields.
ALTER TABLE driver_job_match_scores
  ADD COLUMN IF NOT EXISTS behavior_score SMALLINT NOT NULL DEFAULT 0
    CHECK (behavior_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS confidence TEXT NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS missing_fields JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS actions JSONB NOT NULL DEFAULT
    '{"canApply": true, "canSave": true, "feedback": ["helpful","not_relevant","hide"]}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_djms_driver_confidence
  ON driver_job_match_scores (driver_id, confidence, overall_score DESC);

-- Driver feedback on individual job matches.
CREATE TABLE IF NOT EXISTS driver_match_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  feedback    TEXT NOT NULL CHECK (feedback IN ('helpful', 'not_relevant', 'hide')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (driver_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_dmf_driver_feedback
  ON driver_match_feedback (driver_id, feedback);
CREATE INDEX IF NOT EXISTS idx_dmf_job
  ON driver_match_feedback (job_id);

ALTER TABLE driver_match_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers read own match feedback" ON driver_match_feedback;
CREATE POLICY "Drivers read own match feedback"
  ON driver_match_feedback FOR SELECT
  USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers insert own match feedback" ON driver_match_feedback;
CREATE POLICY "Drivers insert own match feedback"
  ON driver_match_feedback FOR INSERT
  WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers update own match feedback" ON driver_match_feedback;
CREATE POLICY "Drivers update own match feedback"
  ON driver_match_feedback FOR UPDATE
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Driver interaction stream used for behavior scoring.
CREATE TABLE IF NOT EXISTS driver_match_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'save', 'apply')),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dme_driver_type_created
  ON driver_match_events (driver_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dme_driver_job
  ON driver_match_events (driver_id, job_id, created_at DESC);

ALTER TABLE driver_match_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers read own match events" ON driver_match_events;
CREATE POLICY "Drivers read own match events"
  ON driver_match_events FOR SELECT
  USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers insert own match events" ON driver_match_events;
CREATE POLICY "Drivers insert own match events"
  ON driver_match_events FOR INSERT
  WITH CHECK (driver_id = auth.uid());

-- Queue a recompute whenever feedback changes so the next fetch reflects it.
CREATE OR REPLACE FUNCTION enqueue_driver_feedback_recompute()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO matching_recompute_queue (entity_type, entity_id, reason)
  VALUES ('driver_profile', NEW.driver_id, 'feedback_updated')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_driver_feedback_match ON driver_match_feedback;
CREATE TRIGGER trg_driver_feedback_match
  AFTER INSERT OR UPDATE ON driver_match_feedback
  FOR EACH ROW EXECUTE FUNCTION enqueue_driver_feedback_recompute();
