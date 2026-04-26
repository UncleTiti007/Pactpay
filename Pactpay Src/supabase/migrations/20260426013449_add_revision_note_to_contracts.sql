-- Add revision_note to contracts table to store freelancer's request changes
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS revision_note TEXT;
