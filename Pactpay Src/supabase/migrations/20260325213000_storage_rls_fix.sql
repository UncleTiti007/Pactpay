-- ============================================================
-- Pactpay Storage RLS Fix (Version 3 - Robust)
-- Drops all potential conflicting policies and uses SPLIT_PART
-- ============================================================

-- 1. Thoroughly drop all known and potential policies for storage.objects
DO $$ 
BEGIN 
    -- Drop list for 'avatars'
    DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
    DROP POLICY IF EXISTS "avatars_auth_select" ON storage.objects;

    -- Drop list for 'kyc-documents'
    DROP POLICY IF EXISTS "kyc_docs_user_insert" ON storage.objects;
    DROP POLICY IF EXISTS "kyc_docs_user_update" ON storage.objects;
    DROP POLICY IF EXISTS "kyc_docs_user_read" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
    DROP POLICY IF EXISTS "Users can read their own KYC documents" ON storage.objects;
END $$;

-- 2. Clean recreate optimized policies using SPLIT_PART (stable & non-recursive)

-- AVATARS
CREATE POLICY "avatars_policy_all"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND SPLIT_PART(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'avatars' 
    AND SPLIT_PART(name, '/', 1) = auth.uid()::text
);

-- KYC DOCUMENTS
CREATE POLICY "kyc_docs_policy_all"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'kyc-documents' 
    AND SPLIT_PART(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'kyc-documents' 
    AND SPLIT_PART(name, '/', 1) = auth.uid()::text
);
