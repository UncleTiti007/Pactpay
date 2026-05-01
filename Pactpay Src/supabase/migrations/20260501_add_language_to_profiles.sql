-- Add language preference column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Update existing rows to have the default language
UPDATE public.profiles SET language = 'en' WHERE language IS NULL;
