import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") { return new Response("ok", { headers: corsHeaders }); }

  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Auth Header");
    
    // Check Admin status
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Unauthorized");
    
    const { data: profile } = await supabaseClient.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) throw new Error("Unauthorized: Admin privileges required");

    const { dispute_id, resolution } = await req.json(); // 'release' | 'refund'

    const { data: dispute } = await supabaseClient.from("disputes").select("*").eq("id", dispute_id).single();
    if (!dispute || dispute.status === "resolved") throw new Error("Dispute invalid or already resolved");

    const { data: ms } = await supabaseClient.from("milestones").select("*").eq("id", dispute.milestone_id).single();
    const { data: contract } = await supabaseClient.from("contracts").select("*").eq("id", dispute.contract_id).single();

    if (resolution === "release") {
      const { data: p } = await supabaseClient.from("profiles").select("wallet_balance").eq("id", contract.freelancer_id).single();
      await supabaseClient.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + ms.amount }).eq("id", contract.freelancer_id);
      
      await supabaseClient.from("transactions").insert({
        type: "release", amount: ms.amount, to_user_id: contract.freelancer_id, metadata: { note: "Dispute resolved in favor of freelancer" }
      });
      await supabaseClient.from("milestones").update({ status: "completed" }).eq("id", ms.id);
      await supabaseClient.from("notifications").insert({
        user_id: contract.freelancer_id, type: "system", message: `Dispute resolved! Funds for "${ms.name}" released to your wallet.`
      });
    } else if (resolution === "refund") {
      const { data: p } = await supabaseClient.from("profiles").select("wallet_balance").eq("id", contract.client_id).single();
      await supabaseClient.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + ms.amount }).eq("id", contract.client_id);
      
      await supabaseClient.from("transactions").insert({
        type: "refund", amount: ms.amount, to_user_id: contract.client_id, metadata: { note: "Dispute refunded" }
      });
      await supabaseClient.from("milestones").update({ status: "cancelled" }).eq("id", ms.id);
      await supabaseClient.from("notifications").insert({
        user_id: contract.client_id, type: "system", message: `Dispute resolved! Funds for "${ms.name}" refunded to your wallet.`
      });
    }

    await supabaseClient.from("disputes").update({ status: "resolved", resolution_notes: resolution }).eq("id", dispute.id);

    const { data: allMs } = await supabaseClient.from("milestones").select("status").eq("contract_id", contract.id);
    const allCompletedOrCancelled = allMs?.every((m: any) => m.status === "completed" || m.status === "cancelled");
    
    if (allCompletedOrCancelled) {
      await supabaseClient.from("contracts").update({ status: "completed" }).eq("id", contract.id);
    } else {
      await supabaseClient.from("contracts").update({ status: "active" }).eq("id", contract.id);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
