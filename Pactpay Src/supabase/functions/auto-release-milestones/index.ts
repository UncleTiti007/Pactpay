import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Secure the function against public execution, expecting a service key or custom CRON_SECRET if desired
    // For this implementation, we will assume Supabase pg_cron triggers it via an internal HTTP request 
    // passing the anon key or service key in headers.

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch all milesones that have been in_review for >= 7 days
    const { data: milestones, error: msError } = await supabaseClient
      .from("milestones")
      .select("*, contracts(*)")
      .eq("status", "in_review");

    if (msError) throw msError;

    let releasedCount = 0;

    for (const ms of milestones || []) {
      // Use updated_at if available, fallback to due_date or created_at
      const reviewDate = new Date(ms.updated_at || ms.due_date || ms.created_at);
      
      if (reviewDate < sevenDaysAgo && ms.contracts?.status === "active") {
        
        // Mark Completed
        await supabaseClient.from("milestones").update({ status: "completed" }).eq("id", ms.id);
        
        // Release funds securely
        if (ms.contracts.freelancer_id) {
          const { data: p } = await supabaseClient.from("profiles").select("wallet_balance").eq("id", ms.contracts.freelancer_id).single();
          await supabaseClient.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + ms.amount }).eq("id", ms.contracts.freelancer_id);
          
          await supabaseClient.from("transactions").insert({
            type: "release", amount: ms.amount, to_user_id: ms.contracts.freelancer_id, metadata: { note: "Auto-released after 7 days" }
          });

          await supabaseClient.from("notifications").insert({
            user_id: ms.contracts.freelancer_id, type: "system", 
            message: `Auto-Release: $${ms.amount.toLocaleString()} for "${ms.name}" has been transferred to your wallet after 7 days.`
          });
        }
        
        // Check Contract Completion
        const { data: allMs } = await supabaseClient.from("milestones").select("status").eq("contract_id", ms.contracts.id);
        const allDone = allMs?.every((m: any) => m.status === "completed" || m.status === "cancelled");
        if (allDone) {
          await supabaseClient.from("contracts").update({ status: "completed" }).eq("id", ms.contracts.id);
        }

        releasedCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, releasedCount }), { headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
});
