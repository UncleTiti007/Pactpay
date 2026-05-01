create or replace function public.safe_fund_contract(
  p_contract_id uuid,
  p_user_id uuid,
  p_net_amount numeric,
  p_platform_fee numeric,
  p_new_status text
)
returns void
language plpgsql
security definer
as $$
declare
  v_current_balance numeric;
  v_total_amount numeric;
begin
  v_total_amount := p_net_amount + p_platform_fee;

  -- 1. Check and lock balance
  select wallet_balance into v_current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if v_current_balance < v_total_amount then
    raise exception 'Insufficient balance';
  end if;

  -- 2. Deduct total from wallet
  update public.profiles
  set wallet_balance = wallet_balance - v_total_amount
  where id = p_user_id;

  -- 3. Log Escrow Transaction (Store as positive for correct admin accounting)
  insert into public.transactions (type, amount, to_user_id, contract_id)
  values ('escrow', p_net_amount, p_user_id, p_contract_id);

  -- 4. Log Fee Transaction (Store as positive for correct admin accounting)
  insert into public.transactions (type, amount, to_user_id, contract_id)
  values ('fee', p_platform_fee, p_user_id, p_contract_id);

  -- 5. Update Contract Status
  update public.contracts
  set 
    status = p_new_status,
    platform_fee = p_platform_fee,
    funded_at = now()
  where id = p_contract_id;

end;
$$;
