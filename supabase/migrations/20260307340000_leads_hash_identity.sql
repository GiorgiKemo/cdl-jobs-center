-- ============================================================
-- Leads: stable hash-based row identity + soft-delete support
-- ============================================================

-- Soft-delete column: sync marks removed leads instead of deleting them
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Fast index for active-lead queries
CREATE INDEX IF NOT EXISTS leads_deleted_at_idx
  ON public.leads (deleted_at)
  WHERE deleted_at IS NULL;

-- Remove positional-ID rows (row-1, row-2, …) — next sync will recreate
-- them with stable content-hash IDs so shifts no longer corrupt data.
DELETE FROM public.leads WHERE sheet_row_id LIKE 'row-%';

-- Clean up company match scores that referenced those lead rows
-- (they will be recomputed by refresh-company-matches or nightly backfill)
DELETE FROM public.company_driver_match_scores WHERE candidate_source = 'lead';
