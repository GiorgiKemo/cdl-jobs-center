-- ============================================================================
-- Security Fixes Migration — 2026-02-28
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ── FIX #1: Driver private data RLS ──────────────────────────────────────────
-- Problem: driver_profiles has USING(true) — anyone (including anonymous) can
-- read sensitive fields like cdl_number, date_of_birth, phone.
-- Fix: Require authentication. Frontend already only SELECTs safe columns.
-- NOTE: For column-level restriction, a future migration should create a
-- security-definer view exposing only public columns.

DROP POLICY IF EXISTS "Public read driver profiles" ON driver_profiles;

-- Owner reads their own full row (including CDL, DOB, phone)
DROP POLICY IF EXISTS "Drivers read own profile" ON driver_profiles;
CREATE POLICY "Drivers read own profile"
  ON driver_profiles FOR SELECT
  USING (id = auth.uid());

-- Authenticated users can see profiles (for Drivers directory)
-- Frontend only selects: id, first_name, last_name, license_class, years_exp,
-- license_state, about — never cdl_number, date_of_birth, phone
DROP POLICY IF EXISTS "Authenticated read driver profiles" ON driver_profiles;
CREATE POLICY "Authenticated read driver profiles"
  ON driver_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ── FIX #2: Leads tenant isolation ───────────────────────────────────────────
-- Problem: leads table has no company_id in original schema, and RLS allows
-- any company to read ALL leads (multi-tenant data leak).
-- Fix: Add company_id column (IF NOT EXISTS), update RLS to scope by owner.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);

-- Add unique constraint for upsert support (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_company_sheet_unique'
  ) THEN
    ALTER TABLE leads ADD CONSTRAINT leads_company_sheet_unique
      UNIQUE (company_id, sheet_row_id);
  END IF;
END $$;

-- Drop old overly-permissive policies
DROP POLICY IF EXISTS "Companies can read leads" ON leads;
DROP POLICY IF EXISTS "Companies can update lead status" ON leads;

-- New tenant-scoped policies (idempotent)
DROP POLICY IF EXISTS "Companies read own leads" ON leads;
CREATE POLICY "Companies read own leads"
  ON leads FOR SELECT
  USING (company_id = auth.uid());

DROP POLICY IF EXISTS "Companies update own leads" ON leads;
CREATE POLICY "Companies update own leads"
  ON leads FOR UPDATE
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

DROP POLICY IF EXISTS "Companies insert own leads" ON leads;
CREATE POLICY "Companies insert own leads"
  ON leads FOR INSERT
  WITH CHECK (company_id = auth.uid());


-- ── FIX #3: Admin role alignment ─────────────────────────────────────────────
-- Problem: profiles.role CHECK only allows 'driver'|'company', but frontend
-- and AuthContext expect 'admin' role for the AdminDashboard.
-- Fix: Expand the constraint to include 'admin'.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('driver', 'company', 'admin'));


-- ── FIX #8 (partial): Add registration fields to driver/company profiles ────
-- Problem: Registration collects fields that are never persisted to DB.
-- Fix: Add missing columns for data collected at signup.

-- Driver profile: preferences collected during registration
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS interested_in TEXT;
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS next_job_want TEXT;
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS has_accidents TEXT;
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS wants_contact TEXT;

-- Company profile: fields collected during registration
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS contact_title TEXT;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_goal TEXT;
