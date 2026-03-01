-- ============================================================
-- Storage Security Hardening
-- 1. company-logos bucket: create if missing + add RLS policies
-- 2. Bucket-level file size limits for both buckets
-- 3. MIME type restrictions on verification-documents
-- ============================================================

-- ── 1. Ensure company-logos bucket exists ────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ── 2. RLS for company-logos ─────────────────────────────────
-- Companies can only upload to their own folder ({user_id}/*)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Companies can upload own logo'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Companies can upload own logo"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'company-logos'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Companies can update (upsert) their own logo
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Companies can update own logo'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Companies can update own logo"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'company-logos'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Companies can delete their own logo
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Companies can delete own logo'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Companies can delete own logo"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'company-logos'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Public read access for logos (they're displayed on job listings)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public read company logos'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Public read company logos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'company-logos');
  END IF;
END $$;

-- ── 3. Harden verification-documents bucket ──────────────────
-- Add file size limit (10MB) and MIME type restrictions
UPDATE storage.buckets
SET
  file_size_limit = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'verification-documents';

-- Add UPDATE policy so upsert works (INSERT policy already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Companies can update own verification docs'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Companies can update own verification docs"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'verification-documents'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
