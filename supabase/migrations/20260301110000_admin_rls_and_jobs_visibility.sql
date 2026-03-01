-- ============================================================================
-- Admin RLS Access + Jobs Visibility Hardening
-- ============================================================================

-- Central helper so admin policies stay consistent.
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- jobs: keep public browsing to Active only; allow company owner + admin access.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read active jobs" ON jobs;
CREATE POLICY "Public read active jobs"
  ON jobs FOR SELECT
  USING (
    status = 'Active'
    OR company_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins update all jobs" ON jobs;
CREATE POLICY "Admins update all jobs"
  ON jobs FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- applications: admin can read globally (dashboard analytics/triage).
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins read all applications" ON applications;
CREATE POLICY "Admins read all applications"
  ON applications FOR SELECT
  USING (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- leads: admin can read globally.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins read all leads" ON leads;
CREATE POLICY "Admins read all leads"
  ON leads FOR SELECT
  USING (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- subscriptions: admin can read and manage plans.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins read all subscriptions" ON subscriptions;
CREATE POLICY "Admins read all subscriptions"
  ON subscriptions FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins insert subscriptions" ON subscriptions;
CREATE POLICY "Admins insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update subscriptions" ON subscriptions;
CREATE POLICY "Admins update subscriptions"
  ON subscriptions FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- AI matching diagnostics: admin read access for dashboard diagnostics.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins read all driver job match scores" ON driver_job_match_scores;
CREATE POLICY "Admins read all driver job match scores"
  ON driver_job_match_scores FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all company driver match scores" ON company_driver_match_scores;
CREATE POLICY "Admins read all company driver match scores"
  ON company_driver_match_scores FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read recompute queue" ON matching_recompute_queue;
CREATE POLICY "Admins read recompute queue"
  ON matching_recompute_queue FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read text embeddings" ON matching_text_embeddings;
CREATE POLICY "Admins read text embeddings"
  ON matching_text_embeddings FOR SELECT
  USING (public.is_admin(auth.uid()));
