import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") { return new Response("ok", { headers: corsHeaders }); }

  try {
    // @ts-ignore: Deno is available in the Supabase Edge Function environment
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Auth Header");
    
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Unauthorized");

    const { milestone_id } = await req.json();

    const { data: ms } = await supabaseClient.from("milestones").select("*").eq("id", milestone_id).single();
    if (!ms) throw new Error("Milestone not found");
    if (ms.status === "completed") throw new Error("Milestone already released");

    const { data: contract } = await supabaseClient.from("contracts").select("*").eq("id", ms.contract_id).single();
    if (contract.client_id !== user.id) throw new Error("Only the client can approve milestones");

    await supabaseClient.from("milestones").update({ status: "completed" }).eq("id", ms.id);

    if (contract.freelancer_id) {
      const payoutAmount = ms.amount;
      
      const { error: rpcError } = await supabaseClient.rpc("update_wallet_and_log", {
        p_user_id: contract.freelancer_id,
        p_amount: payoutAmount,
        p_type: "release",
        p_contract_id: contract.id,
        p_milestone_id: ms.id
      });
      
      if (rpcError) throw new Error("Failed atomic wallet update: " + rpcError.message);

      await supabaseClient.from("notifications").insert({
        user_id: contract.freelancer_id,
        type: "milestone_approved",
        title: "Milestone Approved",
        message: `Milestone "${ms.title}" approved! $${payoutAmount.toLocaleString()} has been released to your wallet.`
      });
    }

    const { data: allMs } = await supabaseClient.from("milestones").select("status").eq("contract_id", contract.id);
    const allCompleted = allMs?.every((m: any) => m.status === "completed");

    if (allCompleted) {
      await supabaseClient.from("contracts").update({ status: "completed" }).eq("id", contract.id);
    }

    return new Response(JSON.stringify({ success: true, contractCompleted: allCompleted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
