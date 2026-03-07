-- Add decline_reason to company_profiles so admins can record why a company was declined.
-- Declined companies (decline_reason IS NOT NULL) are blocked from the company dashboard.
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;
