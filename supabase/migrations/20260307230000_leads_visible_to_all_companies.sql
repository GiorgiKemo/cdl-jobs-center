-- Let all authenticated users (companies + admins) read AND update ALL leads.
-- Leads are driver candidates — every company should see the full pool
-- and be able to mark status (contacted, hired, dismissed) on any lead.

DROP POLICY IF EXISTS "Authenticated read leads" ON public.leads;
CREATE POLICY "Authenticated read leads" ON public.leads
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Companies update own leads" ON public.leads;
CREATE POLICY "Authenticated update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
