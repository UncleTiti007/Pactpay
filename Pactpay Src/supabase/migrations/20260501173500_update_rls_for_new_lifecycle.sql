-- Fix Contract RLS policies for the new contract lifecycle
DROP POLICY IF EXISTS "Invited users can manage invitations" ON public.contracts;

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
        -- Case 1: Acceptance (setting freelancer_id and status to accepted)
        (status = 'accepted' AND freelancer_id = auth.uid()) OR
        
        -- Case 2: Request Revision (changing status, freelancer_id stays NULL)
        (status = 'revision_requested' AND freelancer_id IS NULL) OR
        
        -- Case 3: Decline (changing status to cancelled)
        (status = 'cancelled' AND freelancer_id IS NULL)
    )
);
