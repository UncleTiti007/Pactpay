import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripeRequest = async (path: string, method: string, body?: Record<string, any>) => {
  const encoded = body
    ? Object.entries(body)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : undefined;

  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encoded,
  });
  return res.json();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    console.log("Auth attempt with token:", token ? "Token present" : "Token missing");

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth verification failed:", userError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Authenticated as user:", user.id);

    const { action, amount, payment_intent_id } = await req.json();

    if (action === "create") {
      if (!amount || amount <= 0) throw new Error("Invalid amount");

      const paymentIntent = await stripeRequest("/payment_intents", "POST", {
        amount: Math.round(amount * 100),
        currency: "usd",
        "metadata[user_id]": user.id,
        "metadata[type]": "wallet_topup",
        "payment_method_types[]": "card",
      });

      if (paymentIntent.error) throw new Error(paymentIntent.error.message);

      return new Response(
        JSON.stringify({ clientSecret: paymentIntent.client_secret }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "confirm") {
      if (!payment_intent_id) throw new Error("Missing payment_intent_id");

      const paymentIntent = await stripeRequest(`/payment_intents/${payment_intent_id}`, "GET");

      if (paymentIntent.error) throw new Error(paymentIntent.error.message);
      if (paymentIntent.status !== "succeeded") throw new Error("Payment not succeeded. Status: " + paymentIntent.status);
      if (paymentIntent.metadata?.user_id !== user.id) throw new Error("User mismatch");

      const topupAmount = paymentIntent.amount / 100;

      // Fetch or create profile
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError.message);
        throw new Error("Failed to retrieve profile data");
      }

      if (!profile) {
        console.log("Profile missing for top-up, creating one...");
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({ 
            id: user.id, 
            email: user.email?.toLowerCase(), 
            wallet_balance: 0,
            account_status: 'active'
          })
          .select()
          .single();
        
        if (createError) throw new Error("Could not create missing profile: " + createError.message);
        profile = newProfile;
      }

      const newBalance = (profile?.wallet_balance || 0) + topupAmount;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", user.id);

      if (updateError) {
        console.error("Balance update failed:", updateError.message);
        throw new Error("Failed to update wallet balance");
      }
      
      console.log("Recording transaction for user:", user.id);
      const { error: txError } = await supabase.from("transactions").insert({
        type: "deposit",
        amount: topupAmount,
        to_user_id: user.id,
        from_user_id: null,
        metadata: { 
          stripe_reference: payment_intent_id,
          note: "Wallet top-up via Stripe"
        }
      });

      if (txError) {
        console.error("Transaction record failed (non-critical):", txError.message);
      }

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "deposit",
        message: `Wallet topped up by $${topupAmount.toFixed(2)}`,
        is_read: false,
      });

      return new Response(
        JSON.stringify({ success: true, newBalance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");

  } catch (err: any) {
    console.error("topup-wallet error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});