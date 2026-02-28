-- =============================================================
-- AI Matching: tables, indexes, RLS, triggers, queue-claim RPC
-- =============================================================

-- 1. driver_job_match_scores
CREATE TABLE IF NOT EXISTS driver_job_match_scores (
  driver_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  overall_score   SMALLINT NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  rules_score     SMALLINT NOT NULL DEFAULT 0,
  semantic_score  SMALLINT,
  score_breakdown JSONB NOT NULL DEFAULT '{}',
  top_reasons     JSONB NOT NULL DEFAULT '[]',
  cautions        JSONB NOT NULL DEFAULT '[]',
  degraded_mode   BOOLEAN NOT NULL DEFAULT FALSE,
  provider        TEXT,
  model           TEXT,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  version         INT NOT NULL DEFAULT 1,
  PRIMARY KEY (driver_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_djms_driver_score
  ON driver_job_match_scores (driver_id, overall_score DESC, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_djms_job_score
  ON driver_job_match_scores (job_id, overall_score DESC);

-- 2. company_driver_match_scores
CREATE TABLE IF NOT EXISTS company_driver_match_scores (
  company_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_source  TEXT NOT NULL CHECK (candidate_source IN ('application', 'lead')),
  candidate_id      UUID NOT NULL,
  candidate_driver_id UUID,
  overall_score     SMALLINT NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  rules_score       SMALLINT NOT NULL DEFAULT 0,
  semantic_score    SMALLINT,
  score_breakdown   JSONB NOT NULL DEFAULT '{}',
  top_reasons       JSONB NOT NULL DEFAULT '[]',
  cautions          JSONB NOT NULL DEFAULT '[]',
  degraded_mode     BOOLEAN NOT NULL DEFAULT FALSE,
  provider          TEXT,
  model             TEXT,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  version           INT NOT NULL DEFAULT 1,
  PRIMARY KEY (company_id, job_id, candidate_source, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_cdms_company_job_score
  ON company_driver_match_scores (company_id, job_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_cdms_company_source
  ON company_driver_match_scores (company_id, candidate_source, overall_score DESC);

-- 3. matching_recompute_queue
CREATE TABLE IF NOT EXISTS matching_recompute_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('driver_profile', 'job', 'application', 'lead')),
  entity_id     UUID NOT NULL,
  company_id    UUID,
  reason        TEXT NOT NULL DEFAULT 'data_change',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  attempts      INT NOT NULL DEFAULT 0,
  max_attempts  INT NOT NULL DEFAULT 3,
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- De-dup index: only one pending item per (entity_type, entity_id, company_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mrq_dedup
  ON matching_recompute_queue (entity_type, entity_id, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::UUID))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_mrq_pending
  ON matching_recompute_queue (status, scheduled_at)
  WHERE status = 'pending';

-- 4. matching_text_embeddings
CREATE TABLE IF NOT EXISTS matching_text_embeddings (
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('driver', 'job', 'application', 'lead')),
  entity_id    UUID NOT NULL,
  content_hash TEXT NOT NULL,
  embedding    JSONB NOT NULL DEFAULT '[]',
  dimensions   INT NOT NULL DEFAULT 384,
  provider     TEXT NOT NULL DEFAULT 'hf',
  model        TEXT NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id)
);

-- 5. matching_rollout_config (singleton)
CREATE TABLE IF NOT EXISTS matching_rollout_config (
  id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shadow_mode         BOOLEAN NOT NULL DEFAULT TRUE,
  driver_ui_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  company_ui_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  company_beta_ids    UUID[] NOT NULL DEFAULT '{}',
  rules_version       INT NOT NULL DEFAULT 1,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO matching_rollout_config DEFAULT VALUES
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- Row-Level Security
-- =============================================================

ALTER TABLE driver_job_match_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers read own matches"
  ON driver_job_match_scores FOR SELECT
  USING (driver_id = auth.uid());

ALTER TABLE company_driver_match_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies read own matches"
  ON company_driver_match_scores FOR SELECT
  USING (company_id = auth.uid());

ALTER TABLE matching_rollout_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read rollout config"
  ON matching_rollout_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Queue and embeddings: service-role only (no client RLS policies)
ALTER TABLE matching_recompute_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_text_embeddings ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- Trigger function: enqueue recompute on data changes
-- =============================================================

CREATE OR REPLACE FUNCTION enqueue_match_recompute()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'driver_profiles' THEN
    INSERT INTO matching_recompute_queue (entity_type, entity_id, reason)
    VALUES ('driver_profile', NEW.id, 'profile_updated')
    ON CONFLICT DO NOTHING;

  ELSIF TG_TABLE_NAME = 'jobs' THEN
    INSERT INTO matching_recompute_queue (entity_type, entity_id, company_id, reason)
    VALUES ('job', NEW.id, NEW.company_id, 'job_updated')
    ON CONFLICT DO NOTHING;

  ELSIF TG_TABLE_NAME = 'applications' THEN
    INSERT INTO matching_recompute_queue (entity_type, entity_id, company_id, reason)
    VALUES ('application', NEW.id, NEW.company_id, 'application_updated')
    ON CONFLICT DO NOTHING;

  ELSIF TG_TABLE_NAME = 'leads' THEN
    INSERT INTO matching_recompute_queue (entity_type, entity_id, company_id, reason)
    VALUES ('lead', NEW.id, NEW.company_id, 'lead_updated')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers
CREATE TRIGGER trg_driver_profile_match
  AFTER INSERT OR UPDATE ON driver_profiles
  FOR EACH ROW EXECUTE FUNCTION enqueue_match_recompute();

CREATE TRIGGER trg_job_match
  AFTER INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION enqueue_match_recompute();

CREATE TRIGGER trg_application_match
  AFTER INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION enqueue_match_recompute();

CREATE TRIGGER trg_lead_match
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION enqueue_match_recompute();

-- =============================================================
-- RPC: atomic queue claim with SKIP LOCKED
-- =============================================================

CREATE OR REPLACE FUNCTION claim_recompute_batch(batch_size INT DEFAULT 20)
RETURNS SETOF matching_recompute_queue AS $$
  UPDATE matching_recompute_queue
  SET status = 'processing',
      started_at = now(),
      attempts = attempts + 1
  WHERE id IN (
    SELECT id
    FROM matching_recompute_queue
    WHERE status = 'pending'
      AND scheduled_at <= now()
    ORDER BY scheduled_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;
