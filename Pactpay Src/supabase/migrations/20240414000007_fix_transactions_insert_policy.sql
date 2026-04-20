-- ============================================================
-- Fix: Add INSERT policy + extend type constraint on transactions
-- Root Cause 1: No INSERT policy blocked client-side inserts
-- Root Cause 2: 'escrow' was not in the allowed type values
-- ============================================================

-- Fix 1: Extend the type check constraint to include 'escrow'
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'withdrawal', 'escrow', 'release', 'refund', 'fee', 'wallet_topup'));

-- Fix 2: Allow authenticated users to insert transactions
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert contract transactions" ON public.transactions;

CREATE POLICY "Users can insert contract transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
