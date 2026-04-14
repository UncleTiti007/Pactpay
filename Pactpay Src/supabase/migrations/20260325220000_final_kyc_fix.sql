-- ============================================================
-- FINAL KYC RLS FIX (User Provided + Clean Slate)
-- ============================================================

-- 1. DROP ALL EXISTING PROFILE POLICIES
-- This includes the ones from the user's list and earlier attempts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- 2. CREATE CLEAN POLICIES WITHOUT RECURSION

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- 3. STORAGE RLS (Ensuring it is also stable)
DROP POLICY IF EXISTS "storage_owner_bypass" ON storage.objects;
DROP POLICY IF EXISTS "avatars_policy_all" ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_policy_all" ON storage.objects;

CREATE POLICY "storage_owner_access" ON storage.objects FOR ALL 
TO authenticated 
USING (
    (bucket_id = 'avatars' OR bucket_id = 'kyc-documents')
    AND (auth.uid()::text = SPLIT_PART(name, '/', 1))
)
WITH CHECK (
    (bucket_id = 'avatars' OR bucket_id = 'kyc-documents')
    AND (auth.uid()::text = SPLIT_PART(name, '/', 1))
);
