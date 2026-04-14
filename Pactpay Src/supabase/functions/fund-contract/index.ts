import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Auth Header");
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) throw new Error("Unauthorized");

    const { contract_id } = await req.json();

    // 1. Fetch Contract
    const { data: contract, error: contractErr } = await supabaseClient
      .from("contracts")
      .select("*")
      .eq("id", contract_id)
      .single();

    if (contractErr || !contract) throw new Error("Contract not found");
    if (contract.client_id !== user.id) throw new Error("Only the client can fund this contract");
    if (contract.status !== "pending") throw new Error("Contract is not in pending status");

    // 2. Compute amounts
    const totalRequired = contract.total_amount;
    const platformFee = totalRequired * 0.02; // 2% fee included in total

    // 3. Check Wallet Balance
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    const currentBalance = profile?.wallet_balance || 0;
    if (currentBalance < totalRequired) {
      throw new Error(`Insufficient balance. You need $${totalRequired.toFixed(2)} but have $${currentBalance.toFixed(2)}.`);
    }

    const newBalance = currentBalance - totalRequired;

    // 4. Execute updates
    // Deduct wallet
    const { error: updateErr } = await supabaseClient
      .from("profiles")
      .update({ wallet_balance: newBalance })
      .eq("id", user.id);
    if (updateErr) throw new Error("Failed to deduct wallet balance");

    // Update contract status and exact fee
    await supabaseClient
      .from("contracts")
      .update({ status: "active", platform_fee: platformFee })
      .eq("id", contract_id);

    // Insert Transactions
    const netAmount = totalRequired - platformFee;
    await supabaseClient.from("transactions").insert([
      {
        type: "deposit",
        amount: netAmount,
        from_user_id: user.id,
        metadata: { contract_id }
      },
      {
        type: "fee",
        amount: platformFee,
        from_user_id: user.id,
        metadata: { contract_id, note: "2% platform fee" }
      }
    ]);

    // Insert Notification to Freelancer if exists
    if (contract.freelancer_id) {
      await supabaseClient.from("notifications").insert({
        user_id: contract.freelancer_id,
        type: "deposit",
        message: `Client has fully funded the contract: ${contract.title}. Work can now begin!`
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
