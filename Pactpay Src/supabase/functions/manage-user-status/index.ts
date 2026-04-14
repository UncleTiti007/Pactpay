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
    
    // 1. Verify Requesting User is Admin
    const { data: { user: adminUser }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !adminUser) throw new Error("Unauthorized");

    const { data: adminProfile } = await supabaseClient
      .from("profiles")
      .select("is_admin")
      .eq("id", adminUser.id)
      .single();

    // Fallback email check if profile is missing is_admin
    const isGlobalAdmin = adminUser.email === 'admin@pactpay.com' || adminUser.email === 'admin@pactpay-demo.com';
    if (!adminProfile?.is_admin && !isGlobalAdmin) {
      throw new Error("Unauthorized: Admin privileges required");
    }

    // 2. Parse Request
    const { target_user_id, status } = await req.json();
    if (!target_user_id || !status) throw new Error("Missing parameters");
    if (!['active', 'deactivated', 'locked'].includes(status)) throw new Error("Invalid status");

    // 3. Update Profile
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ account_status: status })
      .eq("id", target_user_id);

    if (updateError) throw new Error(`Failed to update profile: ${updateError.message}`);

    // 4. (Optional) Invalidate sessions or Ban in Auth
    // For now, we rely on the app-level check in AuthContext/App.tsx
    // but we could also use admin.updateUserById(target_user_id, { ban_duration: status === 'deactivated' ? '87600h' : '0h' })

    return new Response(JSON.stringify({ success: true, message: `User status updated to ${status}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
