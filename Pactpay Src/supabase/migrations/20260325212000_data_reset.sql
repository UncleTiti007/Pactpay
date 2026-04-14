-- ============================================================
-- Pactpay Data Reset Script (Clean Slate)
-- ⚠️ WARNING: This will delete all user-generated data.
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Identify the admin user ID (assuming admin@pactpay.com exists in auth.users)
-- We use a subquery to find the ID to avoid hardcoding it.
DO $$ 
DECLARE 
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@pactpay.com' LIMIT 1;

    IF admin_id IS NULL THEN
        RAISE NOTICE 'Admin user (admin@pactpay.com) not found. Skipping cleanup to avoid data loss.';
        RETURN;
    END IF;

    -- 2. Delete application data tracking
    -- Order matters due to foreign keys
    DELETE FROM public.disputes;
    DELETE FROM public.deliverables;
    DELETE FROM public.milestones;
    DELETE FROM public.contracts;
    DELETE FROM public.transactions;
    DELETE FROM public.notifications;

    -- 3. Delete all profiles except the admin
    DELETE FROM public.profiles WHERE id != admin_id;

    RAISE NOTICE 'Application data reset complete. Profiles preserved for admin: %', admin_id;
END $$;

-- 4. Note on Authentication Data
-- This script does NOT delete users from auth.users. 
-- To test new signups with the SAME emails, you must manually delete them 
-- from the "Authentication" tab in your Supabase Dashboard.
