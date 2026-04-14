-- ============================================================
-- Pactpay Storage Buckets & RLS Policies
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. CREATE BUCKETS
-- -----------------

-- avatars bucket — PUBLIC (profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET public = true;

-- kyc-documents bucket — PRIVATE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/pdf', 'application/pdf']
) ON CONFLICT (id) DO UPDATE SET public = false;

-- evidence bucket — PRIVATE (dispute evidence)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/pdf', 'application/pdf', 'video/mp4']
) ON CONFLICT (id) DO UPDATE SET public = false;


-- 2. STORAGE RLS POLICIES
-- ------------------------

-- *** AVATARS BUCKET — PUBLIC READ, authenticated users upload their own ***

-- Anyone can read avatars (public bucket)
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can upload/update their own avatar (file path starts with their user ID)
CREATE POLICY "avatars_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- *** KYC-DOCUMENTS BUCKET — users upload their own, only admin can read all ***

-- Users can upload their own KYC documents (files go in a folder named after user ID)
CREATE POLICY "kyc_docs_user_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own documents
CREATE POLICY "kyc_docs_user_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can read ALL kyc-documents
CREATE POLICY "kyc_docs_admin_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);


-- *** EVIDENCE BUCKET — contract parties can upload and read ***

-- Authenticated users can upload evidence (files in folder named after contract ID)
CREATE POLICY "evidence_user_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidence');

-- Authenticated users can read evidence for contracts they are party to
CREATE POLICY "evidence_user_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidence'
  AND (
    EXISTS (
      SELECT 1 FROM public.contracts
      WHERE contracts.id::text = (storage.foldername(name))[1]
      AND (contracts.client_id = auth.uid() OR contracts.freelancer_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
);
