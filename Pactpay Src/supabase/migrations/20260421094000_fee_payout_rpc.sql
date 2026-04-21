-- Admin Fee Payout RPC
-- Allows admins to record a withdrawal of platform fees.

CREATE OR REPLACE FUNCTION public.process_fee_payout(
  p_admin_id UUID,
  p_amount NUMERIC,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_fees NUMERIC;
  v_total_payouts NUMERIC;
  v_available_to_payout NUMERIC;
BEGIN
  -- 1. Calculate available revenue
  SELECT COALESCE(SUM(amount), 0) INTO v_total_fees
  FROM public.transactions
  WHERE type = 'fee';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_payouts
  FROM public.transactions
  WHERE type = 'revenue_payout';

  v_available_to_payout := v_total_fees - v_total_payouts;

  -- 2. Validate amount
  IF p_amount > v_available_to_payout THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient platform earnings. Available: $' || v_available_to_payout);
  END IF;

  -- 3. Log the payout transaction
  INSERT INTO public.transactions (
    type,
    amount,
    from_user_id, -- Admin who initiated the payout
    metadata
  ) VALUES (
    'revenue_payout',
    p_amount,
    p_admin_id,
    p_metadata || jsonb_build_object('status', 'completed', 'at', now())
  );

  RETURN json_build_object('success', true, 'available_remaining', v_available_to_payout - p_amount);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.process_fee_payout TO authenticated;
