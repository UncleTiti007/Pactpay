-- Update the contracts status check constraint to include new lifecycle statuses
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_status_check 
CHECK (status IN (
    'draft', 
    'pending', 
    'accepted', 
    'funded', 
    'active', 
    'completed', 
    'cancelled', 
    'disputed', 
    'rejected', 
    'revision_requested'
));
