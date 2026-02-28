-- ============================================================================
-- Security Hardening Migration — 2026-02-28
-- Fix #1: Lock down Edge Function auth (app-level, not DB)
-- Fix #2: Restrict subscriptions RLS to prevent client-side plan escalation
-- ============================================================================

-- ── FIX #2: Subscriptions RLS hardening ────────────────────────────────────
-- Problem: Companies can INSERT and UPDATE their own subscription rows,
-- allowing plan escalation without going through Stripe.
-- Fix: SELECT-only for companies. INSERT restricted to free plan only.
-- No client UPDATE — only service-role (stripe-webhook) can modify.

-- Drop existing permissive policies (both old and new names for idempotency)
DROP POLICY IF EXISTS "Companies can read own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Companies can insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Companies can update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Companies read own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Companies insert free subscription only" ON subscriptions;

-- Companies can only READ their own subscription
CREATE POLICY "Companies read own subscription"
  ON subscriptions FOR SELECT
  USING (company_id = auth.uid());

-- Companies can INSERT only a free-plan row (for initial auto-creation)
-- This prevents inserting a row with plan='unlimited' from the client
CREATE POLICY "Companies insert free subscription only"
  ON subscriptions FOR INSERT
  WITH CHECK (
    company_id = auth.uid()
    AND plan = 'free'
    AND lead_limit = 3
  );

-- No UPDATE policy for companies — only the stripe-webhook Edge Function
-- (using service_role key) can update subscription plan/limits/status.
-- This closes the privilege escalation vector entirely.
