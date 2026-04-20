-- ============================================================
-- Add Milestone Submission Fields and Storage Bucket
-- Goal: Allow freelancers to attach notes and documents/links 
-- when marking a milestone as ready for review.
-- ============================================================

-- 1. Add columns to milestones table
ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS submission_note TEXT,
ADD COLUMN IF NOT EXISTS submission_url TEXT;

-- 2. Create the storage bucket for contract submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-submissions', 'contract-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage RLS Policies
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-submissions');

-- Allow anyone to view submissions (since the bucket is public, but let's be explicit)
CREATE POLICY "Anyone can view submissions"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contract-submissions');

-- Allow owners to delete their own submissions
CREATE POLICY "Owners can delete their submissions"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
