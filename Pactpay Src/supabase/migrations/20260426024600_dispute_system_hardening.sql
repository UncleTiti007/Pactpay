-- Dispute System Hardening
-- Adds 'disputed' status to check constraints and implements automatic contract freezing via triggers

-- 1. Update Milestone Status Constraint
ALTER TABLE milestones 
DROP CONSTRAINT IF EXISTS milestones_status_check;

ALTER TABLE milestones 
ADD CONSTRAINT milestones_status_check 
CHECK (status IN ('pending', 'in_review', 'revision', 'completed', 'cancelled', 'disputed'));

-- 2. Update Contract Status Constraint
ALTER TABLE contracts 
DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE contracts 
ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('draft', 'pending', 'active', 'completed', 'cancelled', 'disputed', 'rejected'));

-- 3. Automatic Freeze Trigger
CREATE OR REPLACE FUNCTION handle_dispute_raised()
RETURNS TRIGGER AS $$
BEGIN
  -- Freeze the Contract
  UPDATE public.contracts 
  SET status = 'disputed' 
  WHERE id = NEW.contract_id;

  -- Freeze the Milestone
  UPDATE public.milestones 
  SET status = 'disputed' 
  WHERE id = NEW.milestone_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_dispute_raised ON public.disputes;

CREATE TRIGGER tr_dispute_raised
AFTER INSERT ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION handle_dispute_raised();
