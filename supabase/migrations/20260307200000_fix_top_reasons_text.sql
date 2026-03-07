-- Update stored top_reasons JSON to replace old label with clearer one
UPDATE public.company_driver_match_scores
SET top_reasons = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'text' = 'Applied/submitted recently'
      THEN jsonb_set(elem, '{text}', '"Active in the last 7 days"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(top_reasons) AS elem
)
WHERE top_reasons IS NOT NULL
  AND top_reasons::text LIKE '%Applied/submitted recently%';
