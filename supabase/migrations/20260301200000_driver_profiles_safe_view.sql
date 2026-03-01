-- ============================================================================
-- Safe View for driver_profiles — 2026-03-01
-- Exposes only non-sensitive columns to authenticated users.
-- Drivers still read their own full row via existing RLS policy.
-- ============================================================================

-- Create a view that only exposes public-safe columns
CREATE OR REPLACE VIEW public.driver_profiles_safe AS
  SELECT
    id,
    first_name,
    last_name,
    license_class,
    years_exp,
    license_state,
    about,
    updated_at
  FROM public.driver_profiles;

-- Grant access to authenticated users (anon should NOT see driver data)
GRANT SELECT ON public.driver_profiles_safe TO authenticated;
REVOKE ALL ON public.driver_profiles_safe FROM anon;

-- Now tighten the base table: remove the broad "Authenticated read" policy
-- and replace it so only the driver themselves can read the full row.
-- Companies/admins use the safe view instead.
DROP POLICY IF EXISTS "Authenticated read driver profiles" ON driver_profiles;
