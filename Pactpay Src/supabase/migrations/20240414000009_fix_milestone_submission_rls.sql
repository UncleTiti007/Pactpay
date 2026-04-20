-- ============================================================
-- Fix Milestone RLS Policies
-- Goal: Allow both clients and freelancers to update milestones
-- throughout the contract lifecycle (funding, submission, release).
-- ============================================================

-- 1. Remove the old restricted policy
DROP POLICY IF EXISTS "Clients can update pending milestones" ON public.milestones;

-- 2. New Policy: Allow CLIENTS to update milestones for their contracts (Active or Pending)
-- This covers marking as released, requested revision, etc.
CREATE POLICY "Clients can update milestones"
ON public.milestones FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_id
        AND c.client_id = auth.uid()
    )
);

-- 3. New Policy: Allow FREELANCERS to submit/update milestones they are assigned to
-- Allows them to set status to 'in_review' and add submission notes/links.
CREATE POLICY "Freelancers can update milestones"
ON public.milestones FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_id
        AND c.freelancer_id = auth.uid()
        AND c.status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_id
        AND c.freelancer_id = auth.uid()
        AND c.status = 'active'
    )
);
