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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { contract_id } = await req.json();

    if (!contract_id) {
      return new Response(JSON.stringify({ error: "contract_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const user = userData.user;

    // Admin client to bypass RLS for deletion
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("contracts")
      .select("client_id, status")
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (contract.client_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the client can delete this contract" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!["pending", "draft"].includes(contract.status)) {
      return new Response(JSON.stringify({ error: "Only pending or draft contracts can be deleted" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Delete milestones first
    const { error: milestoneError } = await supabaseAdmin.from("milestones").delete().eq("contract_id", contract_id);
    if (milestoneError) {
      throw new Error(`Failed to delete milestones: ${milestoneError.message}`);
    }

    // Delete the contract
    const { error: deleteError } = await supabaseAdmin.from("contracts").delete().eq("id", contract_id);
    if (deleteError) {
      throw new Error(`Failed to delete contract: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
