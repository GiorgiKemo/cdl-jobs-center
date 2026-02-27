-- ============================================================================
-- CDL Jobs Center — Supabase Database Schema
-- Generated from codebase references
-- ============================================================================

-- 1. PROFILES — core user identity (linked to Supabase Auth)
-- ============================================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('driver', 'company')),
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. JOBS — job postings by companies
-- ============================================================================
CREATE TABLE public.jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name  TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT,           -- freight type (Box, Dry Van, Flatbed, etc.)
  driver_type   TEXT,           -- Owner Operator | Company Driver | Student
  route_type    TEXT,           -- OTR | Local | Regional | Dedicated | LTL
  team_driving  TEXT,           -- Solo | Team | Both
  location      TEXT,
  pay           TEXT,
  status        TEXT CHECK (status IN ('Draft','Active','Paused','Closed')) DEFAULT 'Active',
  posted_at     TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. APPLICATIONS — driver applications to companies / jobs
-- ============================================================================
CREATE TABLE public.applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
  company_name    TEXT NOT NULL,
  job_title       TEXT,
  first_name      TEXT,
  last_name       TEXT,
  email           TEXT,
  phone           TEXT,
  cdl_number      TEXT,
  zip_code        TEXT,
  available_date  TEXT,
  driver_type     TEXT,
  license_class   TEXT,
  years_exp       TEXT,
  license_state   TEXT,
  solo_team       TEXT,
  notes           TEXT,
  prefs           JSONB,  -- {betterPay, betterHomeTime, healthInsurance, bonuses, newEquipment}
  endorse         JSONB,  -- {doublesTriples, hazmat, tankVehicles, tankerHazmat}
  hauler          JSONB,  -- {box, carHaul, dropAndHook, dryBulk, dryVan, flatbed, ...}
  route           JSONB,  -- {dedicated, local, ltl, otr, regional}
  extra           JSONB,  -- {leasePurchase, accidents, suspended, newsletters}
  pipeline_stage  TEXT CHECK (pipeline_stage IN ('New','Reviewing','Interview','Hired','Rejected')) DEFAULT 'New',
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. DRIVER_PROFILES — extended driver info
-- ============================================================================
CREATE TABLE public.driver_profiles (
  id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  first_name      TEXT,
  last_name       TEXT,
  phone           TEXT,
  cdl_number      TEXT,
  driver_type     TEXT,      -- company, owner-operator, lease, student
  license_class   TEXT,      -- a, b, c, permit
  years_exp       TEXT,      -- none, less-1, 1-3, 3-5, 5+
  license_state   TEXT,
  zip_code        TEXT,
  date_of_birth   TEXT,
  about           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 5. COMPANY_PROFILES — extended company info
-- ============================================================================
CREATE TABLE public.company_profiles (
  id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name  TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  website       TEXT,
  about         TEXT,
  logo_url      TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 6. SAVED_JOBS — driver bookmarks
-- ============================================================================
CREATE TABLE public.saved_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id, job_id)
);

-- 7. MESSAGES — chat messages between drivers and companies (per application)
-- ============================================================================
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id),
  sender_role     TEXT NOT NULL CHECK (sender_role IN ('driver', 'company')),
  body            TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 5000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ  -- null = unread by recipient
);

CREATE INDEX idx_messages_app ON messages(application_id, created_at);
CREATE INDEX idx_messages_unread ON messages(sender_id, read_at) WHERE read_at IS NULL;

-- 8. LEADS — Facebook / Google Sheets driver leads for companies
-- ============================================================================
CREATE TABLE public.leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL DEFAULT 'facebook',
  full_name       TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  state           TEXT,
  years_exp       TEXT,
  is_owner_op     BOOLEAN DEFAULT false,
  truck_year      TEXT,
  truck_make      TEXT,
  truck_model     TEXT,
  status          TEXT CHECK (status IN ('new','contacted','hired','dismissed')) DEFAULT 'new',
  sheet_row_id    TEXT UNIQUE,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_state ON leads(state);
CREATE INDEX idx_leads_status ON leads(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles"          ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"  ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users can insert own profile"  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active jobs"       ON jobs FOR SELECT USING (true);
CREATE POLICY "Companies can insert jobs"     ON jobs FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "Companies can update own jobs" ON jobs FOR UPDATE USING (company_id = auth.uid()) WITH CHECK (company_id = auth.uid());
CREATE POLICY "Companies can delete own jobs" ON jobs FOR DELETE USING (company_id = auth.uid());

-- applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can insert applications"      ON applications FOR INSERT WITH CHECK (driver_id = auth.uid());
CREATE POLICY "Drivers can read own applications"    ON applications FOR SELECT USING (driver_id = auth.uid() OR company_id = auth.uid());
CREATE POLICY "Companies can update own applications" ON applications FOR UPDATE USING (company_id = auth.uid()) WITH CHECK (company_id = auth.uid());

-- driver_profiles
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read driver profiles"            ON driver_profiles FOR SELECT USING (true);
CREATE POLICY "Drivers can insert own profile"         ON driver_profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Drivers can update own driver profile"  ON driver_profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- company_profiles
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read company profiles"             ON company_profiles FOR SELECT USING (true);
CREATE POLICY "Companies can insert own profile"         ON company_profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own company profile"     ON company_profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- saved_jobs
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can manage own saved jobs"  ON saved_jobs FOR ALL USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own conversations" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM applications a WHERE a.id = messages.application_id
    AND (a.driver_id = auth.uid() OR a.company_id = auth.uid()))
);
CREATE POLICY "Send in own conversations" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM applications a WHERE a.id = messages.application_id
    AND (a.driver_id = auth.uid() OR a.company_id = auth.uid()))
);
CREATE POLICY "Mark received as read" ON messages FOR UPDATE USING (
  sender_id != auth.uid() AND EXISTS (SELECT 1 FROM applications a WHERE a.id = messages.application_id
    AND (a.driver_id = auth.uid() OR a.company_id = auth.uid()))
);

-- leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies can read leads" ON leads FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'company')
);
CREATE POLICY "Companies can update lead status" ON leads FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'company')
);

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================
-- Bucket: company-logos (public)
-- Path format: {company_id}/logo.{ext}
-- Max size: 2MB
-- Allowed: PNG, JPG, SVG
