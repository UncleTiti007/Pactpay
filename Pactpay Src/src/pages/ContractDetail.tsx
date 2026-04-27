import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, AlertTriangle, Pencil, Copy, Check, ShieldAlert, ArrowLeft, Link, FileText, Upload, ExternalLink, Download, Clock, MessageSquare, ChevronDown, ChevronUp, MessageSquarePlus, RefreshCcw, XCircle, Send, Maximize2 } from "lucide-react";
import { UserSearch } from "@/components/contract/UserSearch";
import { formatDate, cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  disputed: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  rejected: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const milestoneStatusColors: Record<string, string> = {
  pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  in_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  revision: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  disputed: "bg-red-500/20 text-red-400 border-red-500/30",
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
  const [selectedFreelancer, setSelectedFreelancer] = useState<any>(null);

  // Milestone Submission State
  const [submittingMilestoneId, setSubmittingMilestoneId] = useState<string | null>(null);
  const [submissionNote, setSubmissionNote] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Milestone History & Revision Note State
  const [milestoneHistory, setMilestoneHistory] = useState<Record<string, any[]>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [requestingRevision, setRequestingRevision] = useState<any>(null);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [submittingHistory, setSubmittingHistory] = useState(false);

  const [disputeMessages, setDisputeMessages] = useState<any[]>([]);
  const [newDisputeMessage, setNewDisputeMessage] = useState("");
  const [dispute, setDispute] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [disputeMessages]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  useEffect(() => {
    if (id && user) fetchContract();
  }, [id, user]);

  const fetchContract = async () => {
    try {
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

        // Fetch milestone submission history — ONLY when milestones exist
        // (empty .in([]) would cause a PostgREST crash)
        const { data: history } = await supabase
          .from("milestone_submissions")
          .select("*")
          .in("milestone_id", milestoneIds)
          .order("created_at", { ascending: false });

        if (history) {
          const groupedHistory: Record<string, any[]> = {};
          history.forEach((entry: any) => {
            if (!groupedHistory[entry.milestone_id]) groupedHistory[entry.milestone_id] = [];
            groupedHistory[entry.milestone_id].push(entry);
          });
          setMilestoneHistory(groupedHistory);
        }
      } else {
        // No milestones — clear stale history
        setMilestoneHistory({});
        setDeliverablesByMilestone({});
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

      // Fetch latest dispute regardless of status
      const { data: dData } = await supabase
        .from("disputes")
        .select("*")
        .eq("contract_id", id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (dData?.[0]) {
        setDispute(dData[0]);
        fetchDisputeMessages(dData[0].id);
      } else {
        setDispute(null);
        setDisputeMessages([]);
      }
    } catch (err: any) {
      console.error("fetchContract error:", err);
      toast.error("Failed to load contract. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputeMessages = async (disputeId: string) => {
    const { data } = await supabase
      .from("dispute_messages")
      .select("*, profiles(full_name)")
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: true });
    setDisputeMessages(data || []);
  };

  const handleSendDisputeMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisputeMessage.trim() || !dispute) return;

    const msg = newDisputeMessage;
    setNewDisputeMessage("");

    // Optimistic Update: Add message locally first
    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      dispute_id: dispute.id,
      user_id: user?.id,
      message: msg,
      created_at: new Date().toISOString(),
      profiles: { full_name: user?.user_metadata?.full_name || user?.email || 'You' }
    };
    setDisputeMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from("dispute_messages").insert({
      dispute_id: dispute.id,
      user_id: user?.id,
      message: msg
    });

    if (error) {
      toast.error("Failed to send message: " + error.message);
      setDisputeMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } else {
      fetchDisputeMessages(dispute.id);

      // --- Notify Other Parties ---
      const myName = user?.user_metadata?.full_name || user?.email || "The other party";
      
      // 1. Notify the "Other" User (Client or Freelancer)
      const otherPartyId = user?.id === contract?.client_id ? contract?.freelancer_id : contract?.client_id;
      if (otherPartyId) {
        await supabase.from("notifications").insert({
          user_id: otherPartyId,
          type: "dispute",
          title: "New Dispute Message",
          message: `${myName} posted a message in your dispute.`,
          link: `/contracts/${contract?.id}`
        });
      }

      // 2. Notify Admins
      const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
      if (admins && admins.length > 0) {
        const adminNotifications = admins
          .filter(a => a.id !== user?.id) // Don't notify self if I'm an admin
          .map(admin => ({
            user_id: admin.id,
            type: "dispute",
            title: "Dispute Activity",
            message: `User ${myName} sent a message in Dispute #${dispute.id.substring(0,8)}`,
            link: "/admin"
          }));
        
        if (adminNotifications.length > 0) {
          await supabase.from("notifications").insert(adminNotifications);
        }
      }
    }
  };

  // Realtime listener for dispute messages
  useEffect(() => {
    if (dispute?.id) {
      const channel = supabase
        .channel(`dispute-${dispute.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'dispute_messages',
          filter: `dispute_id=eq.${dispute.id}`
        }, (payload) => {
          fetchDisputeMessages(dispute.id);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [dispute?.id]);

  const isClient = user?.id === contract?.client_id;
  const isFreelancer = user?.id === contract?.freelancer_id;
  const isInvited = user?.email?.toLowerCase() === (activeInvite?.invited_email || contract?.invite_email)?.toLowerCase();
  
  // A contract is funded when it is active or completed
  const isFunded = contract?.status === 'active' || contract?.status === 'completed' || contract?.status === 'disputed';
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
        { type: "escrow", amount: netAmount, from_user_id: user.id, metadata: { contract_id: id } },
        { type: "fee", amount: platformFee, from_user_id: user.id, metadata: { contract_id: id, note: "2% platform fee" } }
      ]);

      if (contract.freelancer_id) {
        await supabase.from("notifications").insert({
          user_id: contract.freelancer_id,
          type: "deposit",
          title: "Contract Funded",
          message: `Client has fully funded the contract: ${contract.title}. Work can now begin!`,
          link: `/contracts/${id}`
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
      if (ms.status === "disputed") throw new Error("This milestone is under dispute and can only be resolved by a Pactpay Admin.");

      // We only update the status. The database trigger (tr_milestone_release) 
      // handles the wallet transfer and transaction recording automatically.
      const { error: msErr } = await supabase
        .from("milestones")
        .update({ status: "completed" })
        .eq("id", ms.id);
        
      if (msErr) throw msErr;

      // Notify the freelancer
      if (contract.freelancer_id) {
        await supabase.from("notifications").insert({
          user_id: contract.freelancer_id,
          type: "milestone_approved",
          title: "Milestone Released",
          message: `Milestone "${ms.title || ms.name}" approved! $${ms.amount.toLocaleString()} has been released to your wallet.`,
          link: `/contracts/${contract.id}`
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke("send-email", {
        body: { type: "milestone_released", contract_id: id, milestone_id: ms.id }
      });

      toast.success("Milestone approved and funds released!");
      setReleasingMilestone(null);
      fetchContract();
    } catch (err: any) {
      console.error("Release error:", err);
      toast.error("Failed to release funds: " + (err.message || "Unknown error"));
    } finally {
      setFunding(false);
    }
  };


  const uploadSubmissionFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('contract-submissions')
      .upload(filePath, file);

    if (uploadError) {
      toast.error("File upload failed: " + uploadError.message);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('contract-submissions')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleMarkReadyWithSubmission = async (milestoneId: string) => {
    setIsUploading(true);
    try {
      let finalUrl = submissionLink;

      if (submissionFile) {
        const uploadedUrl = await uploadSubmissionFile(submissionFile);
        if (!uploadedUrl) {
          setIsUploading(false);
          return;
        }
        finalUrl = uploadedUrl;
      }

      const { error } = await supabase
        .from("milestones")
        .update({
          status: "in_review",
          submission_note: submissionNote,
          submission_url: finalUrl
        })
        .eq("id", milestoneId);

      if (error) throw error;

      // Also record in history table
      await supabase.from("milestone_submissions").insert({
        milestone_id: milestoneId,
        created_by: user.id,
        type: "submission",
        note: submissionNote,
        attachment_url: finalUrl
      });

      // Notify the client
      const m = milestones.find(ms => ms.id === milestoneId);
      await supabase.from("notifications").insert({
        user_id: contract.client_id,
        type: "update",
        title: "Milestone Submitted",
        message: `${user?.user_metadata?.full_name || 'Freelancer'} has submitted "${m?.title || m?.name}" for review.`,
        link: `/contracts/${contract.id}`
      });

      toast.success("Milestone submitted for review!");
      setSubmittingMilestoneId(null);
      setSubmissionNote("");
      setSubmissionLink("");
      setSubmissionFile(null);
      fetchContract();
    } catch (error: any) {
      toast.error("Failed to submit milestone: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const executeRequestRevision = async () => {
    if (!requestingRevision || !revisionFeedback.trim()) {
      toast.error("Please provide feedback for the revision");
      return;
    }

    setSubmittingHistory(true);
    try {
      // 1. Update milestone status
      const { error: mError } = await supabase
        .from("milestones")
        .update({ status: "revision" })
        .eq("id", requestingRevision.id);

      if (mError) throw mError;

      // 2. Record revision request in history
      await supabase.from("milestone_submissions").insert({
        milestone_id: requestingRevision.id,
        created_by: user.id,
        type: "revision_request",
        note: revisionFeedback
      });

      // 3. Notify the freelancer
      await supabase.from("notifications").insert({
        user_id: contract.freelancer_id,
        type: "update",
        title: "Revision Requested",
        message: `The client has requested a revision for: "${requestingRevision.title || requestingRevision.name}". Feedback: ${revisionFeedback.substring(0, 50)}...`,
        link: `/contracts/${contract.id}`
      });

      toast.success("Revision request sent with feedback!");
      setRequestingRevision(null);
      setRevisionFeedback("");
      fetchContract();
    } catch (err: any) {
      toast.error("Failed to request revision: " + err.message);
    } finally {
      setSubmittingHistory(false);
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
    // Mark the specific milestone as disputed
    await supabase.from("milestones").update({ status: "disputed" }).eq("id", disputingMilestone.id);

    // Notify both parties about the dispute
    const parties = [contract.client_id, contract.freelancer_id];
    const milestoneTitle = disputingMilestone.title || disputingMilestone.name || "Milestone";
    const notifications = parties.map(pid => ({
      user_id: pid,
      type: "dispute",
      title: "Dispute Raised",
      message: `${user?.user_metadata?.full_name || 'A party'} has raised a dispute on "${milestoneTitle}". Funds for this milestone are now frozen.`,
      link: `/contracts/${id}`
    }));
    await supabase.from("notifications").insert(notifications);

    // Non-blocking email attempt
    supabase.functions.invoke("send-email", {
      body: { type: "dispute", contract_id: id, dispute_id: dispute.id }
    }).catch(() => {});

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
          link: `/contracts/${id}`
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
    .filter((m) => m.status === "completed" || m.status === "released")
    .reduce((s: number, m: any) => s + (m.amount || 0), 0);
  
  // Escrow = net amount (after platform fee) minus what has already been released
  const platformFee = contract.platform_fee || (contract.total_amount * 0.02);
  const netEscrow = contract.total_amount - platformFee;
  const escrowAmount = isFunded ? (netEscrow - releasedAmount) : 0;

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

        {/* Invitation Banner — shown to invited freelancer when status is pending */}
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
                  {accepting ? "Accept & Start Workspace" : "Accept & Start Workspace"}
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

            {contract.status === "disputed" && dispute && (
              <div className="glass-card p-6 border-destructive/30 bg-destructive/5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-destructive/20 p-2 rounded-lg">
                      <ShieldAlert className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Dispute Resolution Center</h3>
                      <p className="text-xs text-muted-foreground">Admin is reviewing this contract. Communicate below.</p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="animate-pulse">Active Dispute</Badge>
                </div>

                <div className="glass-card flex flex-col h-[600px] border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
                  <div className="absolute top-4 right-4 z-20">
                     <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:bg-amber-500/10 shadow-sm border border-amber-500/20">
                             <Maximize2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-amber-500/20 shadow-2xl">
                          <div className="px-6 py-4 border-b border-border bg-amber-500/5 flex items-center justify-between">
                            <div>
                              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-amber-500" />
                                Dispute Resolution Center
                              </DialogTitle>
                              <DialogDescription className="text-xs text-muted-foreground mt-1">
                                Immersive mediation mode for Dispute #{dispute.id.substring(0,8)}
                              </DialogDescription>
                            </div>
                          </div>
                          
                          <div className="flex-1 flex overflow-hidden">
                            {/* Sidebar with Context */}
                            <div className="w-64 border-r border-border p-6 bg-muted/20 hidden md:block">
                              <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">Dispute Context</h4>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase">Contract</p>
                                  <p className="text-sm font-semibold">{contract.title}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase">Reason</p>
                                  <p className="text-xs italic mt-1 text-muted-foreground/80">"{dispute.reason}"</p>
                                </div>
                              </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 flex flex-col h-full bg-background/50">
                              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                 {disputeMessages.map((msg) => {
                                   const isMe = msg.user_id === user?.id;
                                   const isAdminReply = msg.is_admin_reply;
                                   return (
                                     <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start animate-in fade-in slide-in-from-left-2")}>
                                       <div className="flex items-center gap-2 mb-1.5 px-1">
                                         <span className={cn("text-xs font-bold", isAdminReply ? "text-amber-500" : "text-muted-foreground")}>
                                           {isAdminReply ? "Pactpay Admin" : (msg.profiles?.full_name || 'User')}
                                         </span>
                                         <span className="text-[10px] text-muted-foreground/40 font-medium">
                                           {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                         </span>
                                       </div>
                                       <div className={cn(
                                         "max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm",
                                         isMe ? "bg-primary text-white rounded-tr-none shadow-primary/10" : 
                                         isAdminReply ? "bg-amber-500/10 text-foreground border border-amber-500/20 rounded-tl-none" :
                                         "bg-card text-foreground border border-border rounded-tl-none shadow-black/5"
                                       )}>
                                         {msg.message}
                                       </div>
                                     </div>
                                   );
                                 })}
                                 <div ref={messagesEndRef} />
                              </div>
                              <form onSubmit={handleSendDisputeMessage} className="p-4 bg-card border-t border-border flex gap-3">
                                 <Input 
                                   placeholder="Type a message to the mediation team..." 
                                   className="flex-1 h-11 bg-background/50 border-border focus:border-primary/50 transition-all shadow-inner"
                                   value={newDisputeMessage}
                                   onChange={(e) => setNewDisputeMessage(e.target.value)}
                                 />
                                 <Button type="submit" size="icon" className="h-11 w-11 shadow-lg shadow-primary/20" disabled={!newDisputeMessage.trim()}>
                                   <Send className="h-5 w-5" />
                                 </Button>
                              </form>
                            </div>
                          </div>
                        </DialogContent>
                     </Dialog>
                  </div>

                  <div className="p-3 bg-muted/30 border-b border-border flex justify-between items-center pr-16">
                     <div>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase">Disputed Milestone</p>
                       <p className="text-sm font-semibold mt-0.5">
                         {milestones.find(m => m.id === dispute.milestone_id)?.title || milestones.find(m => m.id === dispute.milestone_id)?.name || "N/A"}
                       </p>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] text-muted-foreground font-bold uppercase">Locked Amount</p>
                       <p className="text-sm font-bold text-amber-500 mt-0.5">
                         ${milestones.find(m => m.id === dispute.milestone_id)?.amount?.toLocaleString()}
                       </p>
                     </div>
                  </div>

                  <div className="p-4 border-b border-border bg-amber-500/[0.03]">
                     <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Dispute Reason</p>
                     <p className="text-xs italic mt-1 text-foreground/80">"{dispute.reason}"</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background/20">
                     {disputeMessages.length === 0 ? (
                       <div className="py-12 text-center opacity-50">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">No messages yet. Drop a message to the admin.</p>
                       </div>
                     ) : (
                       disputeMessages.map((msg) => {
                         const isMe = msg.user_id === user?.id;
                         const isAdminReply = msg.is_admin_reply;
                         
                         return (
                           <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start animate-in fade-in slide-in-from-bottom-1")}>
                             <div className="flex items-center gap-1.5 mb-1 px-1">
                               <span className={cn("text-[10px] font-bold", isAdminReply ? "text-amber-500" : "text-muted-foreground")}>
                                 {isAdminReply ? "Pactpay Admin" : (msg.profiles?.full_name || 'User')}
                               </span>
                               <span className="text-[9px] text-muted-foreground/50">
                                 {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                             </div>
                             <div className={cn(
                               "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                               isMe ? "bg-primary text-white rounded-tr-none" : 
                               isAdminReply ? "bg-amber-500/10 text-foreground border border-amber-500/20 rounded-tl-none" :
                               "bg-card text-foreground border border-border rounded-tl-none"
                             )}>
                               {msg.message}
                             </div>
                           </div>
                         );
                       })
                     )}
                     <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendDisputeMessage} className="p-3 bg-card border-t border-border flex gap-2">
                     <Input 
                       placeholder="Type a message to the admin..." 
                       className="flex-1 h-9 text-sm bg-background/50"
                       value={newDisputeMessage}
                       onChange={(e) => setNewDisputeMessage(e.target.value)}
                     />
                     <Button type="submit" size="icon" className="h-9 w-9" disabled={!newDisputeMessage.trim()}>
                       <Send className="h-4 w-4" />
                     </Button>
                  </form>
               </div>
               <p className="text-[10px] text-muted-foreground mt-3 text-center italic">
                  This conversation is visible to the Client, Freelancer, and Pactpay Administration.
               </p>
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
                            Due: {formatDate(m.due_date)}
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

                        {/* Submission details display (for Client or completed milestones) */}
                        {(m.submission_note || m.submission_url) && (
                          <div className="mt-4 p-3 rounded bg-primary/5 border border-primary/10 space-y-2">
                            <p className="text-xs font-medium text-primary flex items-center gap-1 uppercase tracking-tight">
                              <FileText className="h-3 w-3" /> Submission Details
                            </p>
                            {m.submission_note && (
                              <p className="text-sm text-foreground italic">"{m.submission_note}"</p>
                            )}
                            {m.submission_url && (
                              <div className="flex items-center gap-2">
                                {m.submission_url.includes('supabase.co') ? (
                                  <a 
                                    href={m.submission_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs flex items-center gap-1.5 text-blue-400 hover:underline bg-blue-400/10 px-2 py-1 rounded"
                                  >
                                    <Download className="h-3.3 w-3.3" /> Download Attached Document
                                  </a>
                                ) : (
                                  <a 
                                    href={m.submission_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs flex items-center gap-1.5 text-blue-400 hover:underline bg-blue-400/10 px-2 py-1 rounded"
                                  >
                                    <ExternalLink className="h-3.3 w-3.3" /> View Deliverable Link
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Freelancer Submission Form */}
                        {submittingMilestoneId === m.id && (
                          <div className="mt-4 p-4 rounded-lg bg-card border border-primary/30 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground uppercase">Submission Note</label>
                              <Textarea 
                                placeholder="Details about this milestone..." 
                                value={submissionNote}
                                onChange={(e) => setSubmissionNote(e.target.value)}
                                className="min-h-[80px] bg-background/50 text-sm"
                              />
                            </div>
                            
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase">Deliverable Link</label>
                                <div className="relative">
                                  <Link className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    placeholder="https://..." 
                                    value={submissionLink}
                                    onChange={(e) => setSubmissionLink(e.target.value)}
                                    className="pl-9 bg-background/50 text-sm"
                                    disabled={!!submissionFile}
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase">Or Upload File</label>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full relative h-10 bg-background/50 border-dashed hover:border-primary transition-colors"
                                    disabled={!!submissionLink}
                                  >
                                    <input
                                      type="file"
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                                    />
                                    <Upload className="h-4 w-4 mr-2 text-primary" />
                                    <span className="text-xs truncate">
                                      {submissionFile ? submissionFile.name : "Choose file..."}
                                    </span>
                                  </Button>
                                  {submissionFile && (
                                    <Button size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:text-red-400" onClick={() => setSubmissionFile(null)}>
                                      <Pencil className="h-4 w-4 rotate-45" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                              <Button size="sm" variant="ghost" onClick={() => setSubmittingMilestoneId(null)}>
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                variant="hero" 
                                onClick={() => handleMarkReadyWithSubmission(m.id)}
                                disabled={isUploading}
                              >
                                {isUploading ? "Uploading..." : "Submit for Review"}
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                          {isClient && m.status === "in_review" && contract.status === "active" && (
                            <>
                              <Button size="sm" variant="hero" onClick={() => setReleasingMilestone(m)}>
                                Approve & Release
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setRequestingRevision(m)}>
                                Request Revision
                              </Button>
                            </>
                          )}

                          {(isClient || isFreelancer) &&
                            ["pending", "in_review", "revision"].includes(m.status) &&
                            contract.status === "active" && m.status !== "disputed" && (
                              <Button size="sm" variant="destructive" onClick={() => setDisputingMilestone(m)}>
                                Raise Dispute
                              </Button>
                            )}

                          {isFreelancer && ["pending", "revision"].includes(m.status) && contract.status === "active" && !submittingMilestoneId && (
                            <Button size="sm" variant="hero" onClick={() => setSubmittingMilestoneId(m.id)}>
                              {m.status === "revision" ? "Re-submit for Review" : "Mark Ready for Review"}
                            </Button>
                          )}

                          {m.status === "completed" && (
                            <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Released
                            </span>
                          )}
                        </div>

                        {/* Milestone History Toggle */}
                        {milestoneHistory[m.id] && milestoneHistory[m.id].length > 0 && (
                          <div className="mt-4 border-t border-border/30 pt-3">
                            <button 
                              onClick={() => setExpandedHistory(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mb-2"
                            >
                              <Clock className="h-3 w-3" />
                              View History ({milestoneHistory[m.id].length})
                              {expandedHistory[m.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            
                            {expandedHistory[m.id] && (
                              <div className="space-y-3 pl-2 border-l-2 border-border/50 ml-1 py-1 animate-in fade-in slide-in-from-left-1">
                                {milestoneHistory[m.id].map((event: any) => (
                                  <div key={event.id} className="relative">
                                    <div className="text-[10px] text-muted-foreground flex justify-between">
                                      <span className="flex items-center gap-1 font-medium">
                                        {event.type === 'submission' ? (
                                          <Upload className="h-2.5 w-2.5 text-blue-400" />
                                        ) : (
                                          <MessageSquare className="h-2.5 w-2.5 text-amber-400" />
                                        )}
                                        {event.type === 'submission' ? 'Freelancer Submitted' : 'Client Requested Revision'}
                                      </span>
                                      <span>{new Date(event.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {event.note && (
                                      <p className="text-xs text-foreground mt-1 bg-background/30 p-2 rounded italic">"{event.note}"</p>
                                    )}
                                    {event.attachment_url && (
                                      <div className="mt-1.5">
                                        <a 
                                          href={event.attachment_url} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="text-[10px] flex items-center gap-1 text-blue-400 hover:underline"
                                        >
                                          {event.attachment_url.includes('supabase.co') ? <Download className="h-2.5 w-2.5" /> : <Link className="h-2.5 w-2.5" />}
                                          {event.attachment_url.includes('supabase.co') ? 'Download Attachment' : 'View External Link'}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
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
                  <span className="text-foreground">{formatDate(contract.deadline)}</span>
                </div>
              )}
            </div>
 
            <div className="glass-card flex flex-col border-amber-500/20 bg-amber-500/[0.02] relative overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-amber-500/5 flex justify-between items-center">
                   <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                     <ShieldAlert className="h-3 w-3 text-amber-500" />
                     Mediation Center
                   </h3>
                </div>

                <div className="p-4 space-y-3">
                   {!dispute ? (
                     <div className="py-4 text-center">
                        <CheckCircle className="h-8 w-8 text-green-500/20 mx-auto mb-2" />
                        <p className="text-[10px] text-muted-foreground italic">No disputes recorded for this contract.</p>
                     </div>
                   ) : (
                     <div className="space-y-2">
                        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors cursor-pointer group">
                           <Dialog>
                              <DialogTrigger asChild>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter mb-1">
                                      Dispute #{dispute.id.substring(0,8)}
                                    </p>
                                    <p className="text-xs font-semibold text-foreground line-clamp-1">
                                      {milestones.find(m => m.id === dispute.milestone_id)?.title || milestones.find(m => m.id === dispute.milestone_id)?.name || "General Dispute"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic">
                                      "{dispute.reason}"
                                    </p>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-2">
                                    <Badge variant="outline" className={cn(
                                      "text-[8px] h-3.5 px-1.5 font-bold uppercase",
                                      dispute.status === 'open' ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse" : 
                                      "bg-green-500/10 text-green-500 border-green-500/20"
                                    )}>
                                      {dispute.status || 'RESOLVED'}
                                    </Badge>
                                    <Maximize2 className="h-3 w-3 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                                  </div>
                                </div>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-amber-500/20 shadow-2xl">
                                <div className="px-6 py-4 border-b border-border bg-amber-500/5 flex items-center justify-between">
                                  <div>
                                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                      <MessageSquare className="h-5 w-5 text-amber-500" />
                                      Dispute Resolution Center
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                                      {dispute.status === 'open' ? 'Active mediation session' : 'Archived mediation transcript'} for Dispute #{dispute.id.substring(0,8)}
                                    </DialogDescription>
                                  </div>
                                  <Badge variant="outline" className={cn(
                                    "font-bold",
                                    dispute.status === 'open' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                    "bg-green-500/10 text-green-500 border-green-500/20"
                                  )}>
                                    {dispute.status?.toUpperCase() || 'RESOLVED'}
                                  </Badge>
                                </div>
                                
                                <div className="flex-1 flex overflow-hidden">
                                  <div className="w-64 border-r border-border p-6 bg-muted/20 hidden md:block">
                                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">Dispute Context</h4>
                                    <div className="space-y-4">
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase">Contract</p>
                                        <p className="text-sm font-semibold">{contract.title}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase">Reason</p>
                                        <p className="text-xs italic mt-1 text-muted-foreground/80">"{dispute.reason}"</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase">Milestone</p>
                                        <p className="text-xs font-medium">
                                          {milestones.find(m => m.id === dispute.milestone_id)?.title || milestones.find(m => m.id === dispute.milestone_id)?.name || "N/A"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex-1 flex flex-col h-full bg-background/50">
                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                       {disputeMessages.map((msg) => {
                                         const isMe = msg.user_id === user?.id;
                                         const isAdminReply = msg.is_admin_reply;
                                         return (
                                           <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start animate-in fade-in slide-in-from-left-2")}>
                                             <div className="flex items-center gap-2 mb-1.5 px-1">
                                               <span className={cn("text-xs font-bold", isAdminReply ? "text-amber-500" : "text-muted-foreground")}>
                                                 {isAdminReply ? "Pactpay Admin" : (msg.profiles?.full_name || 'User')}
                                               </span>
                                               <span className="text-[10px] text-muted-foreground/40 font-medium">
                                                 {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                               </span>
                                             </div>
                                             <div className={cn(
                                               "max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm",
                                               isMe ? "bg-primary text-white rounded-tr-none shadow-primary/10" : 
                                               isAdminReply ? "bg-amber-500/10 text-foreground border border-amber-500/20 rounded-tl-none" :
                                               "bg-card text-foreground border border-border rounded-tl-none shadow-black/5"
                                             )}>
                                               {msg.message}
                                             </div>
                                           </div>
                                         );
                                       })}
                                       <div ref={messagesEndRef} />
                                    </div>
                                    {dispute.status === 'open' ? (
                                      <form onSubmit={handleSendDisputeMessage} className="p-4 bg-card border-t border-border flex gap-3">
                                         <Input 
                                           placeholder="Type a message to the mediation team..." 
                                           className="flex-1 h-11 bg-background/50 border-border focus:border-primary/50 transition-all shadow-inner"
                                           value={newDisputeMessage}
                                           onChange={(e) => setNewDisputeMessage(e.target.value)}
                                         />
                                         <Button type="submit" size="icon" className="h-11 w-11 shadow-lg shadow-primary/20" disabled={!newDisputeMessage.trim()}>
                                           <Send className="h-5 w-5" />
                                         </Button>
                                      </form>
                                    ) : (
                                      <div className="p-4 bg-muted/30 border-t border-border text-center">
                                         <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                           Chat is read-only — Dispute Resolved
                                         </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                           </Dialog>
                        </div>
                     </div>
                   )}
                </div>
                
                <div className="px-4 py-2 bg-amber-500/5 border-t border-border">
                   <p className="text-[9px] text-muted-foreground text-center">
                      Secure mediation is powered by Pactpay Escrow Services.
                   </p>
                </div>
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

      {/* Revision Dialog */}
      <Dialog open={!!requestingRevision} onOpenChange={(open) => !open && setRequestingRevision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Revision</DialogTitle>
            <DialogDescription>
              Provide clear feedback to the freelancer on what needs to be changed for "{requestingRevision?.title || requestingRevision?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-4">
            <Textarea
              placeholder="Example: The logo should be slightly larger and the blue color should be darker..."
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
              rows={5}
              className="bg-background/50"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRequestingRevision(null)} disabled={submittingHistory}>
              Cancel
            </Button>
            <Button variant="hero" onClick={executeRequestRevision} disabled={submittingHistory || !revisionFeedback.trim()}>
              {submittingHistory ? "Sending..." : "Send Revision Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractDetail;