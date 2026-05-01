create or replace function update_wallet_and_log(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_contract_id uuid default null,
  p_milestone_id uuid default null,
  p_stripe_reference text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set wallet_balance = wallet_balance + p_amount
  where id = p_user_id;

  insert into public.transactions (type, amount, to_user_id, contract_id, milestone_id, stripe_reference)
  values (p_type, p_amount, p_user_id, p_contract_id, p_milestone_id, p_stripe_reference);
end;
$$;

-- Add resolution fields to disputes table
alter table public.disputes 
add column if not exists resolution_notes text,
add column if not exists client_refund_amount numeric,
add column if not exists freelancer_payout_amount numeric;
