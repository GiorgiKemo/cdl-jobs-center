-- Let all authenticated users (companies + admins) read ALL leads.
-- Leads are driver candidates — every company should see the full pool.

DROP POLICY IF EXISTS "Authenticated read leads" ON public.leads;
CREATE POLICY "Authenticated read leads" ON public.leads
  FOR SELECT TO authenticated
  USING (true);
