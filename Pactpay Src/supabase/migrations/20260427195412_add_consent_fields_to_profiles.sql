-- Add consent fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ;

-- Ensure RLS allows users to update their own consent fields
-- (The existing "Users can update own profile" policy should already cover this)
