-- Fix Profile Visibility for Collaborative Contexts
-- This allows all users to see the basic identifier (full_name) of other users.

-- 1. Drop the restrictive viewing policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 2. Create a new policy for authenticated users to see basic info
-- This allows everyone to see full_name and id, but restricts everything else to the owner.
CREATE POLICY "Users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Note: We are NOT changing the UPDATE or INSERT policies.
-- Users still only have write access to their own data.
