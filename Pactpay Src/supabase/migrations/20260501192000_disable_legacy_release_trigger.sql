-- ============================================================
-- Fix Double Crediting on Milestone Release
-- Goal: Remove the redundant trigger that causes double payments
-- when milestone status is updated to 'completed' via the frontend RPC.
-- ============================================================

-- 1. Drop the legacy trigger that causes double crediting
DROP TRIGGER IF EXISTS tr_milestone_release ON public.milestones;

-- 2. Update milestone_submissions to allow 'release' and 'refund' types
ALTER TABLE public.milestone_submissions 
DROP CONSTRAINT IF EXISTS milestone_submissions_type_check;

ALTER TABLE public.milestone_submissions
ADD CONSTRAINT milestone_submissions_type_check 
CHECK (type IN ('submission', 'revision_request', 'release', 'refund'));

-- 3. Update RLS for milestone_submissions to allow Clients to record releases/refunds
DROP POLICY IF EXISTS "Parties can insert milestone events" ON public.milestone_submissions;

CREATE POLICY "Parties can insert milestone events"
ON public.milestone_submissions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.milestones m
        JOIN public.contracts c ON c.id = m.contract_id
        WHERE m.id = milestone_id
        AND (
            (c.freelancer_id = auth.uid() AND type = 'submission') OR
            (c.client_id = auth.uid() AND type IN ('revision_request', 'release', 'refund'))
        )
    )
);
