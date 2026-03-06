-- Allow companies with unlimited subscription to read all driver_profiles
-- so they can see phone, email, and other contact info in the driver directory.
DROP POLICY IF EXISTS "Unlimited companies read driver profiles" ON public.driver_profiles;
CREATE POLICY "Unlimited companies read driver profiles" ON public.driver_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.company_id = (select auth.uid())
        AND s.plan = 'unlimited'
    )
  );
