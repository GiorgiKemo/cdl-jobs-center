-- Fix: replace partial unique index with a proper unique constraint
-- so that Supabase upsert(onConflict) works correctly

-- Drop the partial index
DROP INDEX IF EXISTS leads_source_sheet_row_id_key;

-- Add a real unique constraint (works with upsert onConflict)
ALTER TABLE leads ADD CONSTRAINT leads_source_sheet_row_id_unique
  UNIQUE (source_sheet, sheet_row_id);
