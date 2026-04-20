-- ============================================================
-- Secure Milestone Release System
-- Goal: Automatically transfer funds and record transactions
-- when a milestone is marked as 'completed'.
-- ============================================================

-- 1. Function to handle the fund transfer
CREATE OR REPLACE FUNCTION public.handle_milestone_release()
RETURNS TRIGGER AS $$
DECLARE
    v_freelancer_id UUID;
    v_contract_title TEXT;
BEGIN
    -- Only run if status changes to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        
        -- Get freelancer ID and contract title
        SELECT freelancer_id, title INTO v_freelancer_id, v_contract_title
        FROM public.contracts
        WHERE id = NEW.contract_id;

        IF v_freelancer_id IS NOT NULL THEN
            -- 1. Transfer funds to freelancer's wallet
            UPDATE public.profiles
            SET wallet_balance = wallet_balance + NEW.amount
            WHERE id = v_freelancer_id;

            -- 2. Record the release transaction
            INSERT INTO public.transactions (
                type, 
                amount, 
                to_user_id, 
                metadata
            ) VALUES (
                'release', 
                NEW.amount, 
                v_freelancer_id, 
                jsonb_build_object(
                    'contract_id', NEW.contract_id,
                    'milestone_id', NEW.id,
                    'note', 'Release for milestone: ' || COALESCE(NEW.title, NEW.name, 'Untitled')
                )
            );

            -- 3. Record in milestone history
            INSERT INTO public.milestone_submissions (
                milestone_id,
                created_by,
                type,
                note
            ) VALUES (
                NEW.id,
                v_freelancer_id, -- Attributing approval log to the process
                'submission', -- Reusing submission type for log or could add 'approval'
                'Funds released: $' || NEW.amount
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS tr_milestone_release ON public.milestones;
CREATE TRIGGER tr_milestone_release
AFTER UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.handle_milestone_release();


-- 3. Ensure RLS allows the status update
-- We need to check if the user is the client of the contract
CREATE OR REPLACE POLICY "Clients can update milestones"
ON public.milestones FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_id
        AND c.client_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_id
        AND c.client_id = auth.uid()
    )
);
