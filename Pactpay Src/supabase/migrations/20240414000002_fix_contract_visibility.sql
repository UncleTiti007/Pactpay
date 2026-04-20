-- Fix contract visibility for invited parties
-- Existing and New policies for SELECT

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

-- Also ensure invited parties can view milestones for these contracts
DROP POLICY IF EXISTS "Users can view related milestones" ON public.milestones;
CREATE POLICY "Users can view related milestones"
ON public.milestones
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_id
        AND (
            c.client_id = auth.uid() OR 
            c.freelancer_id = auth.uid() OR 
            LOWER(auth.jwt()->>'email') = LOWER(c.invite_email)
        )
    )
);

-- Also ensure invited parties can view deliverables for these contracts
DROP POLICY IF EXISTS "Users can view related deliverables" ON public.deliverables;
CREATE POLICY "Users can view related deliverables"
ON public.deliverables
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.milestones m
        JOIN public.contracts c ON c.id = m.contract_id
        WHERE m.id = milestone_id
        AND (
            c.client_id = auth.uid() OR 
            c.freelancer_id = auth.uid() OR 
            LOWER(auth.jwt()->>'email') = LOWER(c.invite_email)
        )
    )
);
