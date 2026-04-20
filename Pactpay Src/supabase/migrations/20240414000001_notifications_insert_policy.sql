-- Add policy to allow authenticated users to send notifications to others
-- This is required for the "Invite" system where User A (Client) notifies User B (Freelancer)
CREATE POLICY "Authenticated users can send notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);
