-- Saved drivers: companies can bookmark driver profiles
CREATE TABLE IF NOT EXISTS public.saved_drivers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, driver_id)
);

ALTER TABLE public.saved_drivers ENABLE ROW LEVEL SECURITY;

-- Companies can read their own saved drivers
DROP POLICY IF EXISTS "Companies read own saved drivers" ON public.saved_drivers;
CREATE POLICY "Companies read own saved drivers" ON public.saved_drivers
  FOR SELECT TO authenticated
  USING (company_id = (select auth.uid()));

-- Companies can save drivers
DROP POLICY IF EXISTS "Companies insert saved drivers" ON public.saved_drivers;
CREATE POLICY "Companies insert saved drivers" ON public.saved_drivers
  FOR INSERT TO authenticated
  WITH CHECK (company_id = (select auth.uid()));

-- Companies can unsave drivers
DROP POLICY IF EXISTS "Companies delete own saved drivers" ON public.saved_drivers;
CREATE POLICY "Companies delete own saved drivers" ON public.saved_drivers
  FOR DELETE TO authenticated
  USING (company_id = (select auth.uid()));

-- Admins full access
DROP POLICY IF EXISTS "Admins manage saved drivers" ON public.saved_drivers;
CREATE POLICY "Admins manage saved drivers" ON public.saved_drivers
  FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_drivers_company ON public.saved_drivers(company_id);
