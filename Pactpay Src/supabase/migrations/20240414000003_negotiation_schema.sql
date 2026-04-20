-- Contract Negotiation System Schema

-- 1. Contract Messages (Chat)
CREATE TABLE IF NOT EXISTS public.contract_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    attachment_url TEXT,
    is_system_message BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contract_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their contracts"
ON public.contract_messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_id
        AND (c.client_id = auth.uid() OR c.freelancer_id = auth.uid() OR LOWER(c.invite_email) = LOWER(auth.jwt()->>'email'))
    )
);

CREATE POLICY "Users can insert messages for their contracts"
ON public.contract_messages FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_id
        AND (c.client_id = auth.uid() OR c.freelancer_id = auth.uid() OR LOWER(c.invite_email) = LOWER(auth.jwt()->>'email'))
    )
);

-- 2. Storage Bucket for Contract Files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contract-files', 'contract-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for contract-files
CREATE POLICY "Parties can upload contract files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'contract-files' AND
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.client_id = auth.uid() OR c.freelancer_id = auth.uid() OR LOWER(c.invite_email) = LOWER(auth.jwt()->>'email'))
    )
);

CREATE POLICY "Parties can view contract files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'contract-files' AND
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.client_id = auth.uid() OR c.freelancer_id = auth.uid() OR LOWER(c.invite_email) = LOWER(auth.jwt()->>'email'))
    )
);

-- 3. Update Contract RLS to allow Client to EDIT while pending
-- NOTE: We must ensure it's not accepted yet
CREATE POLICY "Clients can update pending contracts"
ON public.contracts FOR UPDATE
TO authenticated
USING (
    auth.uid() = client_id AND 
    status IN ('pending', 'draft') AND
    NOT EXISTS (
        SELECT 1 FROM public.contract_invites ci
        WHERE ci.contract_id = public.contracts.id AND ci.accepted = true
    )
)
WITH CHECK (
    auth.uid() = client_id AND 
    status IN ('pending', 'draft')
);

-- 4. Allow clients to update milestones for pending contracts
CREATE POLICY "Clients can update pending milestones"
ON public.milestones FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_id
        AND c.client_id = auth.uid()
        AND c.status IN ('pending', 'draft')
    )
)
WITH CHECK (
     EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_id
        AND c.client_id = auth.uid()
        AND c.status IN ('pending', 'draft')
    )
);

-- Enable Realtime for Messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_messages;
