-- Safe Withdrawal Atomic RPC
-- Updated: Now includes notification creation for the Activity Feed

-- 1. First, delete all old versions so we start fresh
DROP FUNCTION IF EXISTS public.process_withdrawal(uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.process_withdrawal(text, text, text, text, text);

-- 2. Create the robust typed version
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_user_id UUID,
  p_amount NUMERIC,
  p_bank_name TEXT,
  p_account_name TEXT,
  p_account_number TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- 1. Get and Lock the profile row to prevent race conditions
  SELECT wallet_balance INTO v_current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User profile not found');
  END IF;

  -- 2. Validate balance
  IF v_current_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient funds');
  END IF;

  -- 3. Deduct balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_amount
  WHERE id = p_user_id;

  -- 4. Create transaction log
  INSERT INTO public.transactions (
    type,
    amount,
    from_user_id,
    metadata
  ) VALUES (
    'withdrawal',
    p_amount,
    p_user_id,
    json_build_object(
      'status', 'pending',
      'bank_name', p_bank_name,
      'account_name', p_account_name,
      'account_number', p_account_number
    )
  );

  -- 5. Create notification for the activity feed
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message
  ) VALUES (
    p_user_id,
    'withdrawal_pending',
    'Withdrawal Pending',
    'Your withdrawal request for $' || TO_CHAR(p_amount, 'FM999,999,990.00') || ' has been received and is pending approval.'
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. Ensure permissions
GRANT EXECUTE ON FUNCTION public.process_withdrawal TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_withdrawal TO anon;
GRANT EXECUTE ON FUNCTION public.process_withdrawal TO service_role;
