-- ============================================================
-- Automatic Contract Completion System
-- Goal: Automatically transition contract status to 'completed'
-- when all its milestones are in a terminal state.
-- ============================================================

-- 1. Function to check and update contract status
CREATE OR REPLACE FUNCTION public.check_contract_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_remaining_milestones INT;
    v_contract_status TEXT;
BEGIN
    -- Get current contract status
    SELECT status INTO v_contract_status
    FROM public.contracts
    WHERE id = NEW.contract_id;

    -- Only proceed if the contract is currently 'active' or 'disputed'
    -- We don't want to accidentally flip a 'cancelled' or 'draft' contract.
    IF v_contract_status IN ('active', 'disputed') THEN
        
        -- Count milestones that are NOT 'completed' or 'cancelled'
        SELECT COUNT(*) INTO v_remaining_milestones
        FROM public.milestones
        WHERE contract_id = NEW.contract_id
          AND status NOT IN ('completed', 'cancelled');

        -- If no active milestones remain, mark contract as completed
        IF v_remaining_milestones = 0 THEN
            UPDATE public.contracts
            SET status = 'completed'
            WHERE id = NEW.contract_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS tr_check_contract_completion ON public.milestones;
CREATE TRIGGER tr_check_contract_completion
AFTER UPDATE OF status ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.check_contract_completion();
