import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.7";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:8080";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Send email via Gmail SMTP using Nodemailer
const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string
) => {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn("CRITICAL: GMAIL_USER or GMAIL_APP_PASSWORD not found in environment variables.");
    return { simulated: true, error: "Missing credentials" };
  }

  const toList = Array.isArray(to)
    ? to.filter((e) => !!e && e.includes("@"))
    : [to].filter((e) => !!e && e.includes("@"));

  if (toList.length === 0) {
    console.warn("No valid recipients. Skipping email.");
    return { skipped: true };
  }

  console.log(`Attempting to send email via Nodemailer to: ${toList}`);
  
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // Use SSL/TLS
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"Pactpay" <${GMAIL_USER}>`,
      to: toList.join(", "),
      subject,
      html,
    });

    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Nodemailer Error Details:", error);
    throw new Error(`Failed to send email via Nodemailer: ${error.message}`);
  }
};

// Branded HTML email template
const emailTemplate = (
  title: string,
  recipientName: string,
  bodyHtml: string,
  buttonText: string,
  buttonUrl: string
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0F1B2D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="color:#00C27C;font-size:28px;font-weight:800;letter-spacing:-1px;">Pactpay</span>
      <p style="color:#4A5568;font-size:13px;margin:4px 0 0;">Your work. Protected.</p>
    </div>

    <!-- Card -->
    <div style="background:#132338;border-radius:16px;border:1px solid #1e3a5f;overflow:hidden;">

      <!-- Card header bar -->
      <div style="background:#00C27C;height:4px;"></div>

      <!-- Card body -->
      <div style="padding:40px;">
        <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;">${title}</h1>
        <p style="color:#64748b;font-size:14px;margin:0 0 24px;">Hello ${recipientName},</p>
        ${bodyHtml}
        <a href="${buttonUrl}"
           style="display:block;background:#00C27C;color:#0F1B2D;text-align:center;padding:14px 24px;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;margin-top:28px;">
          ${buttonText}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#2D3748;font-size:12px;margin:0;">
        &copy; ${new Date().getFullYear()} Pactpay &mdash; Secure escrow for freelancers and clients.
      </p>
      <p style="color:#2D3748;font-size:11px;margin:4px 0 0;">
        You received this because you are part of a Pactpay contract.
      </p>
    </div>

  </div>
</body>
</html>`;

// Info row helper for contract details
const infoRow = (label: string, value: string) => `
  <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #1e3a5f;">
    <span style="color:#64748b;font-size:14px;">${label}</span>
    <span style="color:#ffffff;font-size:14px;font-weight:600;">${value}</span>
  </div>`;


serve(async (req) => {
  console.log(`DEBUG: send-email function triggered [${req.method}]`);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    
    let user = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      user = authUser;
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "A valid session is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const payload = await req.json();

    const { type, contract_id, invite_id, milestone_id, dispute_id } = payload;

    if (!type) {
      return new Response(JSON.stringify({ error: "Missing type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INVITE ──────────────────────────────────────────────────────────────
    if (type === "invite") {
      if (!contract_id) throw new Error("Missing contract_id for invite email");
      if (!invite_id) throw new Error("Missing invite_id for invite email");

      const { data: contract } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contract_id)
        .single();

      if (!contract) throw new Error("Contract not found");

      const { data: invite } = await supabase
        .from("contract_invites")
        .select("*")
        .eq("id", invite_id)
        .single();
        
      if (!invite) throw new Error("Invite not found");

      const { data: client } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", contract.client_id)
        .single();

      const clientName = client?.full_name || "Someone";
      const inviteLink = `${APP_URL}/invite/${invite.token}`;

      const body = `
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 20px;">
          <strong style="color:#ffffff;">${clientName}</strong> has invited you to work on a contract through Pactpay Escrow. Your payment is protected — funds are only released when you complete agreed milestones.
        </p>
        <div style="background:#0F1B2D;border-radius:10px;padding:16px;margin-bottom:8px;">
          ${infoRow("Contract", contract.title)}
          ${infoRow("Total Amount", `$${contract.total_amount?.toLocaleString()}`)}
          ${contract.deadline ? infoRow("Deadline", new Date(contract.deadline).toLocaleDateString()) : ""}
        </div>`;

      await sendEmail(
        invite.invited_email,
        `${clientName} invited you to a contract on Pactpay`,
        emailTemplate(
          "You have been invited!",
          "there",
          body,
          "View & Accept Contract",
          inviteLink
        )
      );
    }

    // ── DEPOSIT ─────────────────────────────────────────────────────────────
    else if (type === "deposit") {
      if (!contract_id) throw new Error("Missing contract_id for deposit email");

      const { data: contract } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contract_id)
        .single();

      if (!contract) throw new Error("Contract not found");

      const { data: client } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", contract.client_id)
        .single();

      const { data: freelancer } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", contract.freelancer_id)
        .single();

      const contractLink = `${APP_URL}/contracts/${contract_id}`;

      const body = `
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 20px;">
          The full contract amount has been deposited and is now held securely in escrow. Work can begin!
        </p>
        <div style="background:#0F1B2D;border-radius:10px;padding:16px;margin-bottom:8px;">
          ${infoRow("Contract", contract.title)}
          ${infoRow("Amount in escrow", `$${contract.total_amount?.toLocaleString()}`)}
          ${infoRow("Status", "Active — funds secured")}
        </div>`;

      // Send to BOTH client and freelancer
      const recipients = [client?.email, freelancer?.email].filter(Boolean) as string[];
      await sendEmail(
        recipients,
        `Funds secured — ${contract.title} is now active`,
        emailTemplate(
          "Funds secured in escrow",
          "there",
          body,
          "View Contract",
          contractLink
        )
      );
    }

    // ── MILESTONE SUBMITTED ─────────────────────────────────────────────────
    else if (type === "milestone_submitted") {
      if (!contract_id) throw new Error("Missing contract_id");

      const { data: contract } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contract_id)
        .single();

      if (!contract) throw new Error("Contract not found");

      const { data: client } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", contract.client_id)
        .single();

      const { data: freelancer } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", contract.freelancer_id)
        .single();

      // Fetch milestone if provided
      let milestoneTitle = "A milestone";
      let milestoneAmount = "";
      if (milestone_id) {
        const { data: ms } = await supabase
          .from("milestones")
          .select("title, amount")
          .eq("id", milestone_id)
          .single();
        if (ms) {
          milestoneTitle = ms.title;
          milestoneAmount = `$${ms.amount?.toLocaleString()}`;
        }
      }

      const freelancerName = freelancer?.full_name || "Your freelancer";
      const contractLink = `${APP_URL}/contracts/${contract_id}`;

      const body = `
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 20px;">
          <strong style="color:#ffffff;">${freelancerName}</strong> has submitted a milestone for your review. Please check the deliverables and approve to release payment.
        </p>
        <div style="background:#0F1B2D;border-radius:10px;padding:16px;margin-bottom:8px;">
          ${infoRow("Contract", contract.title)}
          ${infoRow("Milestone", milestoneTitle)}
          ${milestoneAmount ? infoRow("Amount", milestoneAmount) : ""}
        </div>`;

      await sendEmail(
        client?.email || "",
        `${freelancerName} submitted a milestone for review on ${contract.title}`,
        emailTemplate(
          "Milestone ready for review",
          client?.full_name || "there",
          body,
          "Review Milestone",
          contractLink
        )
      );
    }

    // ── MILESTONE RELEASED ──────────────────────────────────────────────────
    else if (type === "milestone_released") {
      if (!contract_id) throw new Error("Missing contract_id");

      const { data: contract } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contract_id)
        .single();

      if (!contract) throw new Error("Contract not found");

      const { data: freelancer } = await supabase
        .from("profiles")
        .select("full_name, email, wallet_balance")
        .eq("id", contract.freelancer_id)
        .single();

      const { data: client } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", contract.client_id)
        .single();

      // Fetch milestone if provided
      let milestoneTitle = "A milestone";
      let milestoneAmount = "";
      if (milestone_id) {
        const { data: ms } = await supabase
          .from("milestones")
          .select("title, amount")
          .eq("id", milestone_id)
          .single();
        if (ms) {
          milestoneTitle = ms.title;
          milestoneAmount = `$${ms.amount?.toLocaleString()}`;
        }
      }

      const clientName = client?.full_name || "Your client";
      const dashboardLink = `${APP_URL}/dashboard`;

      const body = `
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 20px;">
          <strong style="color:#ffffff;">${clientName}</strong> has approved your milestone and released the payment to your Pactpay wallet.
        </p>
        <div style="background:#0F1B2D;border-radius:10px;padding:16px;margin-bottom:8px;">
          ${infoRow("Contract", contract.title)}
          ${infoRow("Milestone", milestoneTitle)}
          ${milestoneAmount ? infoRow("Amount released", milestoneAmount) : ""}
          ${freelancer?.wallet_balance ? infoRow("New wallet balance", `$${freelancer.wallet_balance?.toLocaleString()}`) : ""}
        </div>`;

      await sendEmail(
        freelancer?.email || "",
        `Payment released for ${milestoneTitle} on ${contract.title}`,
        emailTemplate(
          "Payment released to your wallet!",
          freelancer?.full_name || "there",
          body,
          "View Wallet",
          dashboardLink
        )
      );
    }

    // ── DISPUTE ─────────────────────────────────────────────────────────────
    else if (type === "dispute") {
      if (!contract_id) throw new Error("Missing contract_id");

      const { data: contract } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contract_id)
        .single();

      if (!contract) throw new Error("Contract not found");

      const { data: client } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", contract.client_id)
        .single();

      const { data: freelancer } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", contract.freelancer_id)
        .single();

      // Fetch dispute details if provided
      let disputeReason = "A dispute has been raised.";
      let milestoneTitle = "";
      if (dispute_id) {
        const { data: dispute } = await supabase
          .from("disputes")
          .select("reason, milestone_id")
          .eq("id", dispute_id)
          .single();
        if (dispute) {
          disputeReason = dispute.reason;
          if (dispute.milestone_id) {
            const { data: ms } = await supabase
              .from("milestones")
              .select("title")
              .eq("id", dispute.milestone_id)
              .single();
            milestoneTitle = ms?.title || "";
          }
        }
      }

      const contractLink = `${APP_URL}/contracts/${contract_id}`;

      const body = `
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 20px;">
          A dispute has been raised on this contract. Funds are <strong style="color:#ff4444;">frozen</strong> until the dispute is resolved by the Pactpay team.
        </p>
        <div style="background:#0F1B2D;border-radius:10px;padding:16px;margin-bottom:8px;">
          ${infoRow("Contract", contract.title)}
          ${milestoneTitle ? infoRow("Milestone", milestoneTitle) : ""}
          ${infoRow("Reason", disputeReason)}
          ${infoRow("Status", "Under review")}
        </div>
        <p style="color:#64748b;font-size:13px;text-align:center;margin-top:16px;">
          Our team will review the evidence and resolve this within 48 hours.
        </p>`;

      // Send to BOTH parties AND admin
      const recipients = [
        client?.email,
        freelancer?.email,
        "pactpay.demo@gmail.com",
      ].filter(Boolean) as string[];

      await sendEmail(
        recipients,
        `Dispute raised on ${contract.title} — funds frozen`,
        emailTemplate(
          "A dispute has been raised",
          "there",
          body,
          "View Contract",
          contractLink
        )
      );
    }

    else {
      throw new Error(`Unknown email type: ${type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("send-email CRITICAL error:", err.message);
    return new Response(JSON.stringify({ 
      error: err.message, 
      stack: err.stack,
      context: "send-email-function-error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});