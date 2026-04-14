-- ============================================================
-- Fix Transactions RLS Policies
-- Goal: Ensure Admin can see all transactions (including top-ups)
-- ============================================================

-- 1. Enable RLS
alter table public.transactions enable row level security;

-- 2. Clean up existing policies
drop policy if exists "Contract parties view transactions" on public.transactions;
drop policy if exists "Contract parties delete transactions" on public.transactions;
drop policy if exists "Admin view all transactions" on public.transactions;
drop policy if exists "Enable read access for all users" on public.transactions;

-- 3. Create NEW SELECT Policies
-- Admin bypass
create policy "Admin view all transactions"
on public.transactions for select
using (
  auth.jwt() ->> 'email' IN ('admin@pactpay.com', 'admin@pactpay-demo.com')
);

-- User view own transactions
create policy "Users view own transactions"
on public.transactions for select
using (
  auth.uid() = to_user_id OR auth.uid() = from_user_id
);

-- 4. Create NEW DELETE Policies (Admin Only)
create policy "Admin delete all transactions"
on public.transactions for delete
using (
  auth.jwt() ->> 'email' IN ('admin@pactpay.com', 'admin@pactpay-demo.com')
);

-- Note: No INSERT policy is needed for users as top-ups are handled via Edge Function (Service Role)
-- and contract releases/refunds are handled via system logic.
