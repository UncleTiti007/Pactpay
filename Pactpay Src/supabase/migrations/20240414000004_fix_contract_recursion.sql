-- Fix Infinite Recursion and Freelancer Acceptance
-- This migration decouples the contracts table from cross-table checks that cause recursion

-- 1. Redefine Select Policy (Ensuring it's clean)
DROP POLICY IF EXISTS "Users can view relevant contracts" ON public.contracts;
CREATE POLICY "Users can view relevant contracts"
ON public.contracts
FOR SELECT
TO authenticated
USING (
    auth.uid() = client_id OR 
    auth.uid() = freelancer_id OR 
    LOWER(auth.jwt()->>'email') = LOWER(invite_email)
);

-- 2. Drop problematic recursive update policy
DROP POLICY IF EXISTS "Clients can update pending contracts" ON public.contracts;

-- 3. New Update Policy for CLIENTS (Non-recursive)
CREATE POLICY "Clients can update pending contracts"
ON public.contracts FOR UPDATE
TO authenticated
USING (
    auth.uid() = client_id AND 
    status IN ('pending', 'draft')
)
WITH CHECK (
    auth.uid() = client_id AND 
    status IN ('pending', 'draft')
);

-- 4. New Update Policy for FREELANCERS / INVITED PARTIES
-- This allows them to "Accept" by setting freelancer_id and status
CREATE POLICY "Freelancers can accept contracts"
ON public.contracts FOR UPDATE
TO authenticated
USING (
    LOWER(auth.jwt()->>'email') = LOWER(invite_email) AND 
    freelancer_id IS NULL AND
    status = 'pending'
)
WITH CHECK (
    auth.uid() = freelancer_id AND 
    status = 'pending'
);

-- 5. Fix Milestones Update Policy (Non-recursive)
DROP POLICY IF EXISTS "Clients can update pending milestones" ON public.milestones;
CREATE POLICY "Clients can update pending milestones"
ON public.milestones FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.contracts c ON c.client_id = p.id
        WHERE c.id = contract_id
        AND p.id = auth.uid()
        AND c.status IN ('pending', 'draft')
    )
);
