-- Company verification request system
-- Companies submit verification info; admins review and approve/reject.

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Submission fields
  dot_number       TEXT,
  business_ein     TEXT,
  years_in_business TEXT,
  fleet_size       TEXT,
  notes            TEXT,
  document_urls    TEXT[] DEFAULT '{}',
  -- Admin review
  reviewed_by      UUID REFERENCES profiles(id),
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Companies can view their own requests
CREATE POLICY "Companies can view own verification requests"
  ON verification_requests FOR SELECT
  USING (company_id = auth.uid());

-- Companies can insert their own requests (only pending)
CREATE POLICY "Companies can insert own verification requests"
  ON verification_requests FOR INSERT
  WITH CHECK (company_id = auth.uid() AND status = 'pending');

-- Admins can view all requests
CREATE POLICY "Admins can view all verification requests"
  ON verification_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admins can update any request (approve/reject)
CREATE POLICY "Admins can update verification requests"
  ON verification_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Companies can upload verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access
CREATE POLICY "Public read verification docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-documents');
