-- ============================================================
-- Fix Milestone Status Constraints
-- Goal: Ensure the database allowed statuses match 
-- the application's states.
-- ============================================================

-- 1. Remove the old restrictive status check
ALTER TABLE public.milestones DROP CONSTRAINT IF EXISTS milestones_status_check;

-- 2. Add the updated check that includes 'completed' and 'released'
-- This ensures fund releases and approval transitions work perfectly.
ALTER TABLE public.milestones ADD CONSTRAINT milestones_status_check 
CHECK (status IN ('pending', 'in_review', 'revision', 'approved', 'completed', 'released'));
