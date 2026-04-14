-- Add email column to profiles if it doesn't exist and make it unique
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- Add unique constraint to email
-- First, handle any existing duplicates if they exist (unlikely in a clean dev env, but good practice)
-- For now, we'll just add the constraint. If it fails, the user will need to clean up.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
