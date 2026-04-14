-- ============================================================
-- Add User Account Status Management
-- ============================================================

-- 1. Add account_status column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active'
CHECK (account_status IN ('active', 'deactivated', 'locked'));

-- 2. Update existing accounts to be 'active' by default (redundant but safe)
UPDATE public.profiles SET account_status = 'active' WHERE account_status IS NULL;

-- 3. Ensure Admin can update this field
-- The existing "Admin can update profiles" policy covers this, 
-- but we make sure RLS doesn't block it.
-- We already have broad Admin update access on profiles from previous fixes.
