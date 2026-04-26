-- Fix Contract RLS policies to allow invited users to request revisions or decline
DROP POLICY IF EXISTS "Freelancers can accept contracts" ON public.contracts;

CREATE POLICY "Invited users can manage invitations"
ON public.contracts FOR UPDATE
TO authenticated
USING (
    LOWER(auth.jwt()->>'email') = LOWER(invite_email) AND 
    status = 'pending'
)
WITH CHECK (
    LOWER(auth.jwt()->>'email') = LOWER(invite_email) AND
    (
        -- Case 1: Acceptance (setting freelancer_id)
        (status = 'pending' AND freelancer_id = auth.uid()) OR
        -- Case 2: Request Revision (changing status, freelancer_id stays NULL)
        (status = 'revision_requested' AND freelancer_id IS NULL) OR
        -- Case 3: Decline (changing status to rejected)
        (status = 'rejected' AND freelancer_id IS NULL)
    )
);

-- Also ensure clients can update contracts in 'revision_requested' status
DROP POLICY IF EXISTS "Clients can update pending contracts" ON public.contracts;
CREATE POLICY "Clients can update pending and revision contracts"
ON public.contracts FOR UPDATE
TO authenticated
USING (
    auth.uid() = client_id AND 
    status IN ('pending', 'draft', 'revision_requested')
)
WITH CHECK (
    auth.uid() = client_id AND 
    status IN ('pending', 'draft', 'revision_requested')
);
