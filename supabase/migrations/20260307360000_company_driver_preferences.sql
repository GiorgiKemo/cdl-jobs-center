-- Add driver hiring preferences to company_profiles
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS driver_types_wanted TEXT,
  ADD COLUMN IF NOT EXISTS endorsements_needed TEXT[];

COMMENT ON COLUMN public.company_profiles.driver_types_wanted IS 'company_driver | owner_operator | both';
COMMENT ON COLUMN public.company_profiles.endorsements_needed IS 'Array of required endorsements e.g. {Hazmat,Tanker}';
