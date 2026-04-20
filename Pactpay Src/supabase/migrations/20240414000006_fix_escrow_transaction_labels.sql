-- Fix escrow transaction labels for the Admin Master Ledger
-- Transactions recorded during contract funding were previously labeled as 'deposit'.
-- The Admin Ledger's "Escrow" tab filters for type = 'escrow'.
-- This migration relabels those transactions so the Admin Ledger is accurate.

UPDATE public.transactions
SET type = 'escrow'
WHERE type = 'deposit'
  AND metadata->>'contract_id' IS NOT NULL;

-- Also ensure any funded contracts that are active have funded_at set
-- (catches contracts funded before the funded_at column was introduced)
UPDATE public.contracts
SET funded_at = updated_at
WHERE status IN ('active', 'completed', 'disputed')
  AND funded_at IS NULL;
