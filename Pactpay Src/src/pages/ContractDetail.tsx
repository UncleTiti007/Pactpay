import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, AlertTriangle, Pencil, Copy, Check, ShieldAlert, ArrowLeft } from "lucide-react";
import { UserSearch } from "@/components/contract/UserSearch";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  disputed: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const milestoneStatusColors: Record<string, string> = {
  pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  in_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  revision: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  approved: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  released: "bg-green-500/20 text-green-400 border-green-500/30",
};

const ContractDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [contract, setContract] = useState<any>(null);
  const [activeInvite, setActiveInvite] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [deliverablesByMilestone, setDeliverablesByMilestone] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [freelancerName, setFreelancerName] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [kycVerified, setKycVerified] = useState(true);

  const [funding, setFunding] = useState(false);
  const [releasingMilestone, setReleasingMilestone] = useState<any>(null);
  const [disputingMilestone, setDisputingMilestone] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const [editingEmail, setEditingEmail] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [deletingContract, setDeletingContract] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  useEffect(() => {
    if (id && user) fetchContract();
  }, [id, user]);

  const fetchContract = async () => {
    const { data: c } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single();

    if (!c) {
      toast.error("Contract not found");
      navigate("/dashboard");
      return;
    }

    setContract(c);

    // Fetch latest active invite
    const { data: invs } = await supabase
      .from("contract_invites")
      .select("*")
      .eq("contract_id", id)
      .eq("accepted", false)
      .order("created_at", { ascending: false })
      .limit(1);

    const latestInvite = invs?.[0] || null;
    setActiveInvite(latestInvite);
    setNewInviteEmail(latestInvite?.invited_email || c.invite_email || "");

    const { data: ms } = await supabase
      .from("milestones")
      .select("*")
      .eq("contract_id", id)
      .order("order_index", { ascending: true });

    const milestoneList = ms || [];
    setMilestones(milestoneList);

    if (milestoneList.length > 0) {
      const milestoneIds = milestoneList.map((m: any) => m.id);
      const { data: allDeliverables } = await supabase
        .from("deliverables")
        .select("*")
        .in("milestone_id", milestoneIds)
        .order("order_index", { ascending: true });

      const grouped: Record<string, any[]> = {};
      (allDeliverables || []).forEach((d: any) => {
        if (!grouped[d.milestone_id]) grouped[d.milestone_id] = [];
        grouped[d.milestone_id].push(d);
      });
      setDeliverablesByMilestone(grouped);
    }

    if (c.client_id) {
      const { data: cp } = await supabase.from("profiles").select("full_name").eq("id", c.client_id).single();
      setClientName(cp?.full_name || "Unknown");
    }

    if (c.freelancer_id) {
      const { data: fp } = await supabase.from("profiles").select("full_name").eq("id", c.freelancer_id).single();
      setFreelancerName(fp?.full_name || "Unknown");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance, kyc_verified")
      .eq("id", user.id)
      .single();
    setWalletBalance(profile?.wallet_balance || 0);
    setKycVerified(profile?.kyc_verified ?? false);

    setLoading(false);
  };

  const isClient = user?.id === contract?.client_id;
  const isFreelancer = user?.id === contract?.freelancer_id;
  const isInvited = user?.email?.toLowerCase() === (activeInvite?.invited_email || contract?.invite_email)?.toLowerCase();
  const isFunded = !!contract?.funded_at;
  const totalRequired = contract?.total_amount || 0;

  const handleFundContract = async () => {
    if (!kycVerified) {
      toast.error("KYC verification required before funding contracts.");
      return;
    }
    if (!user || !contract) return;
    setFunding(true);
    try {
      const totalAmount = contract.total_amount;
      const platformFee = totalAmount * 0.02; // 2% fee included
      const netAmount = totalAmount - platformFee;

      const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", user.id).single();
      const currentBalance = profile?.wallet_balance || 0;
      if (currentBalance < totalAmount) {
        toast.error(`Insufficient balance. You need $${totalAmount.toFixed(2)} but have $${currentBalance.toFixed(2)}.`);
        setFunding(false);
        return;
      }

      const newBalance = currentBalance - totalAmount;
      const { error: updateErr } = await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", user.id);
      if (updateErr) throw new Error("Failed to deduct wallet balance");

      const { error: cErr } = await supabase.from("contracts").update({ 
        status: "active", 
        platform_fee: platformFee,
        funded_at: new Date().toISOString()
      }).eq("id", id);
      if (cErr) throw new Error("Failed to activate contract");

      await supabase.from("transactions").insert([
        { type: "deposit", amount: netAmount, from_user_id: user.id, metadata: { contract_id: id } },
        { type: "fee", amount: platformFee, from_user_id: user.id, metadata: { contract_id: id, note: "2% platform fee" } }
      ]);

      if (contract.freelancer_id) {
        await supabase.from("notifications").insert({
          user_id: contract.freelancer_id,
          type: "deposit",
          message: `Client has fully funded the contract: ${contract.title}. Work can now begin!`
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke("send-email", {
        body: { type: "deposit", contract_id: id }
      });
      toast.success("Contract funded and now active!");
      fetchContract();
    } catch (err: any) {
      toast.error("Failed to fund contract: " + err.message);
    } finally {
      setFunding(false);
    }
  };

  const executeApprove = async () => {
    if (!releasingMilestone || !contract) return;
    setFunding(true);
    try {
      const ms = releasingMilestone;
      if (ms.status === "completed") throw new Error("Milestone already released");

      const { error: msErr } = await supabase.from("milestones").update({ status: "completed" }).eq("id", ms.id);
      if (msErr) throw new Error("Failed to update milestone status");

      if (contract.freelancer_id) {
        const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", contract.freelancer_id).single();
        const newBalance = (profile?.wallet_balance || 0) + ms.amount;
        
        await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", contract.freelancer_id);
        
        await supabase.from("transactions").insert({
          type: "release", amount: ms.amount, to_user_id: contract.freelancer_id, metadata: { contract_id: id, milestone_id: ms.id }
        });
        
        await supabase.from("notifications").insert({
          user_id: contract.freelancer_id, type: "milestone_approved", message: `Milestone "${ms.title || ms.name}" approved! $${ms.amount.toLocaleString()} has been released to your wallet.`
        });
      }

      const { data: allMs } = await supabase.from("milestones").select("status").eq("contract_id", id);
      const allCompleted = allMs?.every((m: any) => m.status === "completed");
      
      if (allCompleted) {
        await supabase.from("contracts").update({ status: "completed" }).eq("id", id);
      }

      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke("send-email", {
        body: { type: "milestone_released", contract_id: id, milestone_id: ms.id }
      });
      toast.success("Funds released to freelancer!");
      setReleasingMilestone(null);
      fetchContract();
    } catch (err: any) {
      toast.error("Failed to release funds: " + err.message);
    } finally {
      setFunding(false);
    }
  };

  const markReady = async (milestoneId: string) => {
    const { error } = await supabase
      .from("milestones")
      .update({ status: "in_review" })
      .eq("id", milestoneId);
    if (error) {
      toast.error("Failed to update milestone");
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke("send-email", {
        body: { type: "milestone_submitted", contract_id: id, milestone_id: milestoneId }
      });
      toast.success("Marked as ready for review! Client notified.");
      fetchContract();
    }
  };

  const toggleDeliverable = async (deliverableId: string, currentChecked: boolean) => {
    if (!isClient) return;
    await supabase
      .from("deliverables")
      .update({
        is_checked: !currentChecked,
        checked_at: !currentChecked ? new Date().toISOString() : null,
      })
      .eq("id", deliverableId);
    fetchContract();
  };

  const handleAcceptInvite = async () => {
    if (!user || !contract) return;
    
    if (!kycVerified) {
      toast.error("You must complete KYC verification before accepting contracts.");
      return;
    }

    setAccepting(true);
    try {
      // 1. Update contract status and assign freelancer
      const { error: cError } = await supabase
        .from("contracts")
        .update({ freelancer_id: user.id, status: "pending" })
        .eq("id", contract.id);

      if (cError) throw cError;

      // 2. Mark the invite as accepted if we have one
      if (activeInvite) {
        await supabase
          .from("contract_invites")
          .update({ accepted: true })
          .eq("id", activeInvite.id);
      } else {
        // Find and mark by email if activeInvite wasn't found in handleInitialLoad
        await supabase
          .from("contract_invites")
          .update({ accepted: true })
          .eq("contract_id", contract.id)
          .eq("invited_email", user.email?.toLowerCase())
          .eq("accepted", false);
      }

      // 3. Notify the client
      await supabase.from("notifications").insert({
        user_id: contract.client_id,
        type: "update",
        title: "Contract Accepted!",
        message: `${user?.user_metadata?.full_name || user.email} has accepted your contract: "${contract.title}". You can now fund the contract to start work.`,
        link: `/contracts/${contract.id}`
      });

      toast.success("Contract accepted! The client can now fund the contract to activate it.");
      fetchContract();
    } catch (err: any) {
      toast.error("Failed to accept contract: " + err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!user || !contract) return;
    
    setAccepting(true);
    try {
      // 1. Update contract status
      const { error: cError } = await supabase
        .from("contracts")
        .update({ status: "cancelled", freelancer_id: null })
        .eq("id", contract.id);

      if (cError) throw cError;

      // 2. Notify the client
      await supabase.from("notifications").insert({
        user_id: contract.client_id,
        type: "update",
        title: "Contract Invite Declined",
        message: `${user?.user_metadata?.full_name || user.email} has declined your invitation for "${contract.title}".`,
        link: `/contracts/${contract.id}`
      });

      toast.info("Contract invitation declined.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Failed to decline contract: " + err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!disputingMilestone || !disputeReason.trim()) {
      toast.error("Please provide a reason for the dispute");
      return;
    }
    setSubmittingDispute(true);

    const { data: dispute, error } = await supabase
      .from("disputes")
      .insert({
        contract_id: id,
        milestone_id: disputingMilestone.id,
        raised_by: user.id,
        reason: disputeReason,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to raise dispute: " + error.message);
      setSubmittingDispute(false);
      return;
    }

    await supabase.from("contracts").update({ status: "disputed" }).eq("id", id);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.functions.invoke("send-email", {
      body: { type: "dispute", contract_id: id, dispute_id: dispute.id }
    });

    toast.success("Dispute raised. Funds are frozen pending review.");
    setDisputingMilestone(null);
    setDisputeReason("");
    fetchContract();
    setSubmittingDispute(false);
  };

  const handleSaveEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setSavingEmail(true);
    
    try {
      // If a registered freelancer was selected via search
      if (selectedFreelancer) {
        // 1. Update the contract directly
        const { error: cError } = await supabase
          .from("contracts")
          .update({ 
            freelancer_id: selectedFreelancer.id, 
            invite_email: selectedFreelancer.email.toLowerCase() 
          })
          .eq("id", id);
          
        if (cError) throw cError;

        // 2. Insert into invites table (for tracking/fallback)
        const { data: invite } = await supabase
          .from("contract_invites")
          .insert({ 
            contract_id: id, 
            invited_email: selectedFreelancer.email.toLowerCase() 
          })
          .select().single();

        // 3. Notify the freelancer internally
        await supabase.from("notifications").insert({
          user_id: selectedFreelancer.id,
          type: "invite",
          title: "New Contract Invite",
          message: `You have been invited to a new contract: ${contract.title}`,
          link: invite ? `/invite/${invite.token}` : `/contracts/${id}`
        });

        // 4. Trigger email as backup
        await supabase.functions.invoke("send-email", {
          body: { type: "invite", contract_id: id, invite_id: invite?.id }
        });

        toast.success(`Contract assigned to ${selectedFreelancer.full_name} and notification sent!`);
      } else {
        // Fallback: Traditional email invite for new users
        if (!newInviteEmail) {
           toast.error("Please search for a user or enter an email address");
           setSavingEmail(false);
           return;
        }

        const { data: invite, error } = await supabase
          .from("contract_invites")
          .insert({ contract_id: id, invited_email: newInviteEmail.toLowerCase() })
          .select().single();
          
        if (error) throw error;

        await supabase.functions.invoke("send-email", {
          body: { type: "invite", contract_id: id, invite_id: invite.id }
        });
        
        // Also update the contract's invite_email field for consistency
        await supabase.from("contracts").update({ 
          invite_email: newInviteEmail.toLowerCase(),
          freelancer_id: null 
        }).eq("id", id);

        toast.success("Invite email sent successfully!");
      }

      setEditingEmail(false);
      setSelectedFreelancer(null);
      fetchContract();
    } catch (err: any) {
      toast.error("Failed to update freelancer: " + err.message);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/invite/${activeInvite?.token || contract?.invite_token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeleteContract = async () => {
    if (!contract || !user) return;
    if (contract.client_id !== user.id) {
      toast.error("You are not authorized to delete this contract.");
      return;
    }
    if (contract.status !== "pending" && contract.status !== "draft") {
      toast.error("Only pending or draft contracts can be deleted.");
      return;
    }

    setIsDeleting(true);
    try {
      const { error: msError } = await supabase.from("milestones").delete().eq("contract_id", id);
      if (msError) throw new Error("Could not delete associated milestones.");

      const { error: cError } = await supabase.from("contracts").delete().eq("id", id);
      if (cError) throw new Error("Could not delete contract. Verify permissions.");

      toast.success("Contract deleted successfully");
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error("Failed to delete contract: " + err.message);
      setIsDeleting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );
  }

  if (!contract) return null;

  const releasedAmount = milestones
    .filter((m) => m.status === "released")
    .reduce((s: number, m: any) => s + (m.amount || 0), 0);
  const escrowAmount = contract.total_amount - releasedAmount;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto px-4 py-8">

        {!kycVerified && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Your KYC verification is pending. Funding or accepting contracts is restricted until your identity is verified.
            <a href="/profile" className="underline ml-1">Check status</a>
          </div>
        )}

        {/* Invitation Banner */}
        {contract.status === "pending" && isInvited && activeInvite && (
          <div className="mb-8 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <CheckCircle className="h-5 w-5" />
                  <h2 className="text-xl">Contract Invitation</h2>
                </div>
                <p className="text-muted-foreground">
                  {clientName} has invited you to work on <span className="font-medium text-foreground">"{contract.title}"</span>. 
                  Review the details below and accept to proceed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="hero" size="lg" onClick={handleAcceptInvite} disabled={accepting || !kycVerified}>
                  {accepting ? "Accepting..." : "Accept & Start Workspace"}
                </Button>
                <Button variant="ghost" size="lg" onClick={handleDeclineInvite} disabled={accepting} className="text-muted-foreground">
                  Decline
                </Button>
              </div>
            </div>
            {!kycVerified && (
              <p className="mt-3 text-xs text-amber-400">
                You must complete identity verification in your profile before you can accept this contract.
              </p>
            )}
          </div>
        )}

        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")} 
            className="mb-4 -ml-2 h-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{contract.title}</h1>
              <Badge variant="outline" className={statusColors[contract.status] || statusColors.draft}>
                {contract.status}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Client: {clientName} · Assigned User:{" "}
            {contract.freelancer_id ? (
              freelancerName
            ) : (
              <span className="text-amber-400 italic">Awaiting acceptance</span>
            )}
          </p>

          {isClient && contract.status === "pending" && !contract.freelancer_id && (
            <div className="mt-3 space-y-3 max-w-md">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User Assignment</span>
              {editingEmail ? (
                <div className="space-y-3">
                  <UserSearch 
                    onSelect={(user) => {
                      setSelectedFreelancer(user);
                      if (user) setNewInviteEmail(user.email);
                    }}
                    onEmailChange={(email) => {
                      setNewInviteEmail(email);
                      setSelectedFreelancer(null);
                    }}
                    defaultValue={newInviteEmail}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="hero" className="flex-1" onClick={handleSaveEmail} disabled={savingEmail}>
                      {savingEmail ? "Assigning..." : "Assign & Notify"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingEmail(false); setNewInviteEmail(contract.invite_email || ""); setSelectedFreelancer(null); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-card/50 border border-border rounded-lg px-3 py-2">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-muted-foreground">Invite sent to:</p>
                    <p className="text-sm font-medium truncate text-foreground">{activeInvite?.invited_email || contract.invite_email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingEmail(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Change Freelancer">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        const toastId = toast.loading("Resending invite...");
                        try {
                          const { error } = await supabase.functions.invoke("send-email", {
                            body: { type: "invite", contract_id: id, invite_id: activeInvite?.id }
                          });
                          if (error) throw error;
                          toast.success("Invite email resent successfully!", { id: toastId });
                        } catch (err: any) {
                          toast.error("Failed to resend: " + (err.message || "Unknown error"), { id: toastId });
                        }
                      }} 
                      className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                      title="Resend Invitation"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {contract.description && (
              <div className="glass-card p-5">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Scope of Work</h3>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{contract.description}</p>
              </div>
            )}

            <div className="glass-card p-5">
              <h3 className="mb-4 font-semibold text-foreground">Milestones</h3>
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No milestones found for this contract.</p>
              ) : (
                <div className="space-y-4">
                  {milestones.map((m: any) => {
                    const deliverables = deliverablesByMilestone[m.id] || [];
                    const milestoneTitle = m.title || m.name || `Milestone ${(m.order_index || 0) + 1}`;
                    return (
                      <div key={m.id} className="rounded-lg border border-border bg-card/50 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{milestoneTitle}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">${m.amount?.toLocaleString()}</span>
                            <Badge variant="outline" className={`text-xs ${milestoneStatusColors[m.status] || milestoneStatusColors.pending}`}>
                              {m.status?.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>

                        {m.due_date && (
                          <p className="mb-3 text-xs text-muted-foreground">
                            Due: {new Date(m.due_date).toLocaleDateString()}
                          </p>
                        )}

                        {deliverables.length > 0 && (
                          <div className="mb-3 space-y-1 border-t border-border/50 pt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Deliverables</p>
                            {deliverables.map((d: any) => (
                              <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={d.is_checked}
                                  onChange={() => toggleDeliverable(d.id, d.is_checked)}
                                  disabled={!isClient}
                                  className="accent-primary"
                                />
                                <span className={d.is_checked ? "line-through text-muted-foreground" : "text-foreground"}>
                                  {d.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                          {isClient && m.status === "in_review" && contract.status === "active" && (
                            <>
                              <Button size="sm" variant="hero" onClick={() => setReleasingMilestone(m)}>
                                Approve & Release
                              </Button>
                              <Button size="sm" variant="outline" onClick={async () => {
                                await supabase.from("milestones").update({ status: "revision" }).eq("id", m.id);
                                toast.success("Revision requested");
                                fetchContract();
                              }}>
                                Request Revision
                              </Button>
                            </>
                          )}

                          {(isClient || isFreelancer) &&
                            ["pending", "in_review", "revision"].includes(m.status) &&
                            contract.status === "active" && (
                              <Button size="sm" variant="destructive" onClick={() => setDisputingMilestone(m)}>
                                Raise Dispute
                              </Button>
                            )}

                          {isFreelancer && m.status === "pending" && contract.status === "active" && (
                            <Button size="sm" variant="hero" onClick={() => markReady(m.id)}>
                              Mark Ready for Review
                            </Button>
                          )}

                          {m.status === "released" && (
                            <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Released
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {isClient && contract.status === "pending" && !isFunded && (
              <div className="glass-card p-5 border-primary/30 bg-primary/5">
                <h3 className="mb-3 font-semibold text-foreground">Fund Contract</h3>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Milestones Total</span>
                    <span className="text-foreground">${(contract.total_amount * 0.98).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform Fee (2%)</span>
                    <span className="text-foreground">${(contract.total_amount * 0.02).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border/50 pt-2 flex justify-between font-semibold text-foreground">
                    <span>Total required to fund</span>
                    <span>${contract.total_amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-3 pt-2 border-t border-border/50">
                    <span className="text-muted-foreground">Your Wallet Balance</span>
                    <span className={walletBalance >= totalRequired ? "text-green-400" : "text-red-400"}>
                      ${walletBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {!kycVerified ? (
                  <p className="text-xs text-amber-400 text-center py-2">
                    KYC required. <a href="/profile" className="underline">Check status</a>
                  </p>
                ) : walletBalance >= totalRequired ? (
                  <Button className="w-full" variant="hero" onClick={handleFundContract} disabled={funding}>
                    {funding ? "Processing..." : "Fund Contract"}
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" onClick={() => navigate("/dashboard")}>
                    Insufficient balance — Top Up Wallet
                  </Button>
                )}
              </div>
            )}

            <div className="glass-card p-5">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Escrow Status</h3>
              {isFunded ? (
                <>
                  <p className="text-2xl font-bold text-foreground">${escrowAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {escrowAmount > 0 ? "Funds held in escrow" : "All funds released"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-amber-400">Awaiting deposit</p>
                  <p className="text-xs text-muted-foreground">
                    Client must deposit ${contract.total_amount?.toLocaleString()} to activate
                  </p>
                </>
              )}
            </div>

            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Contract Details</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Milestones Total</span>
                <span className="text-foreground">${(contract.total_amount * 0.98).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee (2% incl.)</span>
                <span className="text-foreground">${(contract.total_amount * 0.02).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-2">
                <span className="text-muted-foreground">Total Budget</span>
                <span className="text-foreground">${contract.total_amount?.toLocaleString()}</span>
              </div>
              {contract.deadline && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className="text-foreground">{new Date(contract.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {isClient && !isFunded && ["pending", "draft"].includes(contract.status) && (
              <div className="pt-2">
                <Button 
                  variant="destructive" 
                  className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" 
                  onClick={() => setDeletingContract(true)}
                >
                  Delete Contract
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  This action cannot be undone.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!releasingMilestone} onOpenChange={(open) => !open && setReleasingMilestone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve & Release Funds</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve "{releasingMilestone?.title || releasingMilestone?.name}"?
              This will permanently release ${releasingMilestone?.amount?.toLocaleString()} to the freelancer's wallet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setReleasingMilestone(null)} disabled={funding}>Cancel</Button>
            <Button variant="hero" onClick={executeApprove} disabled={funding}>
              {funding ? "Processing..." : "Release Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!disputingMilestone} onOpenChange={(open) => { if (!open) { setDisputingMilestone(null); setDisputeReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise a Dispute</DialogTitle>
            <DialogDescription>
              Raising a dispute will freeze all funds on this contract until our team resolves the issue.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Milestone: <span className="text-foreground font-medium">{disputingMilestone?.title || disputingMilestone?.name}</span>
            </p>
            <Textarea
              placeholder="Describe the issue in detail..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDisputingMilestone(null); setDisputeReason(""); }} disabled={submittingDispute}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmitDispute} disabled={submittingDispute || !disputeReason.trim()}>
              {submittingDispute ? "Submitting..." : "Raise Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletingContract} onOpenChange={(open) => !open && setDeletingContract(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contract</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{contract?.title}"? This action cannot be undone and any sent invites will become invalid.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setDeletingContract(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteContract} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Modal */}
      <Dialog open={!!disputingMilestone} onOpenChange={(open) => !open && setDisputingMilestone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise a Dispute</DialogTitle>
            <DialogDescription>
              Provide the reason for the dispute. The escrowed funds will be frozen until the admin intervenes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground uppercase">Milestone</span>
              <p className="font-medium">{disputingMilestone?.title || disputingMilestone?.name}</p>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground uppercase">Reason</span>
              <Textarea
                placeholder="Explain the issue clearly..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDisputingMilestone(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSubmitDispute} disabled={submittingDispute}>
              {submittingDispute ? "Submitting..." : "Freeze Funds & Raise Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractDetail;