import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, AlertTriangle, Pencil, Copy, Check, ShieldAlert, ArrowLeft, Link, FileText, Upload, ExternalLink, Download, Clock, MessageSquare, ChevronDown, ChevronUp, RefreshCcw, XCircle, Send, Maximize2 } from "lucide-react";
import { UserSearch } from "@/components/contract/UserSearch";
import TopUpModal from "@/components/dashboard/TopUpModal";
import { formatDate, cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  accepted: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  funded: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
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
  const { t } = useTranslation();

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
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<any>(null);

  const [submittingMilestoneId, setSubmittingMilestoneId] = useState<string | null>(null);
  const [submissionNote, setSubmissionNote] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [milestoneHistory, setMilestoneHistory] = useState<Record<string, any[]>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [requestingRevision, setRequestingRevision] = useState<any>(null);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [isSubmittingHistory, setSubmittingHistory] = useState(false);

  const [disputeMessages, setDisputeMessages] = useState<any[]>([]);
  const [newDisputeMessage, setNewDisputeMessage] = useState("");
  const [dispute, setDispute] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [disputeMessages]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

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
        toast.error(t("contract.detail.error.notFound"));
        navigate("/dashboard");
        return;
      }

      setContract(c);

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
        setMilestoneHistory({});
        setDeliverablesByMilestone({});
      }

      if (c.client_id) {
        const { data: cp } = await supabase.from("profiles").select("full_name").eq("id", c.client_id).single();
        setClientName(cp?.full_name || t("common.unknown"));
      }

      if (c.freelancer_id) {
        const { data: fp } = await supabase.from("profiles").select("full_name").eq("id", c.freelancer_id).single();
        setFreelancerName(fp?.full_name || t("common.unknown"));
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance, kyc_verified")
        .eq("id", user!.id)
        .single();
      setWalletBalance(profile?.wallet_balance || 0);
      setKycVerified(profile?.kyc_verified ?? false);

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
      toast.error(t("contract.detail.error.fetchFailed"));
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

    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      dispute_id: dispute.id,
      user_id: user?.id,
      message: msg,
      created_at: new Date().toISOString(),
      profiles: { full_name: user?.user_metadata?.full_name || user?.email || t("common.you") }
    };
    setDisputeMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from("dispute_messages").insert({
      dispute_id: dispute.id,
      user_id: user?.id,
      message: msg
    });

    if (error) {
      toast.error(t("contract.detail.error.sendMessage") + ": " + error.message);
      setDisputeMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } else {
      fetchDisputeMessages(dispute.id);

      const myName = user?.user_metadata?.full_name || user?.email || t("common.otherParty");
      
      const otherPartyId = user?.id === contract?.client_id ? contract?.freelancer_id : contract?.client_id;
      if (otherPartyId) {
        await supabase.from("notifications").insert({
          user_id: otherPartyId,
          type: "dispute",
          title: "contract.notif.disputeMessageTitle",
          message: "contract.notif.disputeMessageMsg",
          metadata: { name: myName },
          link: `/contracts/${contract?.id}`
        });
      }

      const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
      if (admins && admins.length > 0) {
        const adminNotifications = admins
          .filter(a => a.id !== user?.id)
          .map(admin => ({
            user_id: admin.id,
            type: "dispute",
            title: "contract.notif.adminDisputeTitle",
            message: "contract.notif.adminDisputeMsg",
            metadata: { name: myName, id: dispute.id.substring(0,8) },
            link: "/admin"
          }));
        
        if (adminNotifications.length > 0) {
          await supabase.from("notifications").insert(adminNotifications);
        }
      }
    }
  };

  useEffect(() => {
    if (dispute?.id) {
      const channel = supabase
        .channel(`dispute-${dispute.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'dispute_messages',
          filter: `dispute_id=eq.${dispute.id}`
        }, () => {
          fetchDisputeMessages(dispute.id);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [dispute?.id]);

  const isClient = user?.id === contract?.client_id;
  const isFreelancer = user?.id === contract?.freelancer_id;
  const isInvited = user?.email?.toLowerCase() === (activeInvite?.invited_email || contract?.invite_email)?.toLowerCase();
  
  const isFunded = ['funded', 'active', 'completed', 'disputed'].includes(contract?.status);
  const totalRequired = contract?.total_amount || 0;

  const handleFundContract = async () => {
    if (!kycVerified) {
      toast.error(t("contract.detail.error.kycRequired"));
      return;
    }
    if (!user || !contract) return;
    setFunding(true);
    try {
      const totalAmount = contract.total_amount;
      const platformFee = totalAmount * 0.02;
      const netAmount = totalAmount - platformFee;

      const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", user.id).single();
      const currentBalance = profile?.wallet_balance || 0;
      if (currentBalance < totalAmount) {
        toast.error(t("contract.detail.error.insufficientBalance", { required: totalAmount.toFixed(2), current: currentBalance.toFixed(2) }));
        setFunding(false);
        return;
      }

      // Use the new atomic RPC to fund the contract
      const targetStatus = (contract.freelancer_id && !activeInvite) ? "active" : "funded";
      
      const { error: rpcErr } = await supabase.rpc("safe_fund_contract", {
        p_contract_id: id,
        p_user_id: user.id,
        p_net_amount: netAmount,
        p_platform_fee: platformFee,
        p_new_status: targetStatus
      });
      
      if (rpcErr) throw new Error(t("contract.detail.error.activateFailed") + ": " + rpcErr.message);

      if (contract.freelancer_id) {
        await supabase.from("notifications").insert({
          user_id: contract.freelancer_id,
          type: "deposit",
          title: "contract.notif.fundedTitle",
          message: "contract.notif.fundedMsg",
          metadata: { title: contract.title },
          link: `/contracts/${id}`
        });
      }

      await supabase.functions.invoke("send-email", {
        body: { type: "deposit", contract_id: id }
      });
      toast.success(t("contract.detail.success.funded"));
      fetchContract();
    } catch (err: any) {
      toast.error(t("contract.detail.error.fundFailed") + ": " + err.message);
    } finally {
      setFunding(false);
    }
  };

  const executeApprove = async () => {
    if (!releasingMilestone || !contract) return;
    setFunding(true);
    try {
      const ms = releasingMilestone;
      if (ms.status === "completed") throw new Error(t("contract.detail.error.alreadyReleased"));
      if (ms.status === "disputed") throw new Error(t("contract.detail.error.disputeActive"));

      const { error: msErr } = await supabase
        .from("milestones")
        .update({ status: "completed" })
        .eq("id", ms.id);
        
      if (msErr) throw msErr;

      if (contract.freelancer_id) {
        // 2. Add to milestone history
        await supabase.from("milestone_submissions").insert({
          milestone_id: ms.id,
          created_by: user!.id,
          type: "release", 
          note: `Funds released: $${ms.amount.toLocaleString()}`
        });

        const { error: rpcErr } = await supabase.rpc("update_wallet_and_log", {
          p_user_id: contract.freelancer_id,
          p_amount: ms.amount,
          p_type: 'release',
          p_contract_id: contract.id,
          p_milestone_id: ms.id
        });
        if (rpcErr) throw rpcErr;

        await supabase.from("notifications").insert({
          user_id: contract.freelancer_id,
          type: "milestone_approved",
          title: "contract.notif.milestoneReleasedTitle",
          message: "contract.notif.milestoneReleasedMsg",
          metadata: { title: ms.title || ms.name, amount: ms.amount.toLocaleString() },
          link: `/contracts/${contract.id}`
        });
      }

      await supabase.functions.invoke("send-email", {
        body: { type: "milestone_released", contract_id: id, milestone_id: ms.id }
      });

      toast.success(t("contract.detail.success.released"));
      setReleasingMilestone(null);
      fetchContract();
    } catch (err: any) {
      console.error("Release error:", err);
      toast.error(t("contract.detail.error.releaseFailed") + ": " + (err.message || t("common.unknownError")));
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
      toast.error(t("contract.detail.error.uploadSubmission") + ": " + uploadError.message);
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

      await supabase.from("milestone_submissions").insert({
        milestone_id: milestoneId,
        created_by: user!.id,
        type: "submission",
        note: submissionNote,
        attachment_url: finalUrl
      });

      const m = milestones.find(ms => ms.id === milestoneId);
      await supabase.from("notifications").insert({
        user_id: contract.client_id,
        type: "update",
        title: "contract.notif.milestoneSubmittedTitle",
        message: "contract.notif.milestoneSubmittedMsg",
        metadata: { name: user?.user_metadata?.full_name || t("common.freelancer"), title: m?.title || m?.name },
        link: `/contracts/${contract.id}`
      });

      toast.success(t("contract.detail.success.submitted"));
      setSubmittingMilestoneId(null);
      setSubmissionNote("");
      setSubmissionLink("");
      setSubmissionFile(null);
      fetchContract();
    } catch (error: any) {
      toast.error(t("contract.detail.error.submitMilestone") + ": " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const executeRequestRevision = async () => {
    if (!requestingRevision || !revisionFeedback.trim()) {
      toast.error(t("contract.detail.error.revisionFeedback"));
      return;
    }

    try {
      const { error: mError } = await supabase
        .from("milestones")
        .update({ status: "revision" })
        .eq("id", requestingRevision.id);

      if (mError) throw mError;

      await supabase.from("milestone_submissions").insert({
        milestone_id: requestingRevision.id,
        created_by: user!.id,
        type: "revision_request",
        note: revisionFeedback
      });

      await supabase.from("notifications").insert({
        user_id: contract.freelancer_id,
        type: "update",
        title: "contract.notif.revisionRequestedTitle",
        message: "contract.notif.revisionRequestedMsg",
        metadata: { title: requestingRevision.title || requestingRevision.name, feedback: revisionFeedback.substring(0, 50) },
        link: `/contracts/${contract.id}`
      });

      toast.success(t("contract.detail.success.revisionRequested"));
      setRequestingRevision(null);
      setRevisionFeedback("");
      fetchContract();
    } catch (err: any) {
      toast.error(t("contract.detail.error.requestRevision") + ": " + err.message);
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
      toast.error(t("contract.detail.error.kycAccept"));
      return;
    }

    setAccepting(true);
    try {
      const { error: cError } = await supabase
        .from("contracts")
        .update({ 
          freelancer_id: user.id, 
          status: contract.status === "funded" ? "active" : "accepted" 
        })
        .eq("id", contract.id);

      if (cError) throw cError;

      if (activeInvite) {
        await supabase
          .from("contract_invites")
          .update({ accepted: true })
          .eq("id", activeInvite.id);
      } else {
        await supabase
          .from("contract_invites")
          .update({ accepted: true })
          .eq("contract_id", contract.id)
          .eq("invited_email", user.email?.toLowerCase())
          .eq("accepted", false);
      }

      await supabase.from("notifications").insert({
        user_id: contract.client_id,
        type: "update",
        title: "contract.notif.acceptTitle",
        message: "contract.notif.acceptMsg",
        metadata: { name: user?.user_metadata?.full_name || user.email, title: contract.title },
        link: `/contracts/${contract.id}`
      });

      toast.success(t("contract.detail.success.accepted"));
      fetchContract();
    } catch (err: any) {
      toast.error(t("contract.detail.error.acceptFailed") + ": " + err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!user || !contract) return;
    
    setAccepting(true);
    try {
      const { error: cError } = await supabase
        .from("contracts")
        .update({ status: "cancelled", freelancer_id: null })
        .eq("id", contract.id);

      if (cError) throw cError;

      await supabase.from("notifications").insert({
        user_id: contract.client_id,
        type: "update",
        title: t("contract.notif.declineTitle"),
        message: t("contract.notif.declineMsg", { name: user?.user_metadata?.full_name || user.email, title: contract.title }),
        link: `/contracts/${contract.id}`
      });

      toast.info(t("contract.detail.info.declined"));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(t("contract.detail.error.declineFailed") + ": " + err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleCancelContract = async () => {
    if (!contract) return;
    setFunding(true);
    try {
      const { error: cError } = await supabase
        .from("contracts")
        .update({ status: "cancelled" })
        .eq("id", contract.id);

      if (cError) throw cError;

      if (contract.freelancer_id) {
        await supabase.from("notifications").insert({
          user_id: contract.freelancer_id,
          type: "update",
          title: "contract.notif.cancelTitle",
          message: "contract.notif.cancelMsg",
          metadata: { name: user?.user_metadata?.full_name || user?.email, title: contract.title },
          link: `/contracts/${contract.id}`
        });
      }

      toast.success(t("contract.detail.cancelSuccess"));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(t("contract.detail.cancelFailed") + ": " + err.message);
    } finally {
      setFunding(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!disputingMilestone || !disputeReason.trim()) {
      toast.error(t("contract.detail.error.disputeReason"));
      return;
    }
    setSubmittingDispute(true);

    const { data: dispute_res, error } = await supabase
      .from("disputes")
      .insert({
        contract_id: id,
        milestone_id: disputingMilestone.id,
        raised_by: user!.id,
        reason: disputeReason,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      toast.error(t("contract.detail.error.disputeRaise") + ": " + error.message);
      setSubmittingDispute(false);
      return;
    }

    await supabase.from("contracts").update({ status: "disputed" }).eq("id", id);
    await supabase.from("milestones").update({ status: "disputed" }).eq("id", disputingMilestone.id);

    const parties = [contract.client_id, contract.freelancer_id];
    const milestoneTitle = disputingMilestone.title || disputingMilestone.name || t("common.milestone");
    const notifications = parties.map(pid => ({
      user_id: pid,
      type: "dispute",
      title: "contract.notif.disputeRaisedTitle",
      message: "contract.notif.disputeRaisedMsg",
      metadata: { name: user?.user_metadata?.full_name || t("common.aParty"), title: milestoneTitle },
      link: `/contracts/${id}`
    }));
    await supabase.from("notifications").insert(notifications);

    supabase.functions.invoke("send-email", {
      body: { type: "dispute", contract_id: id, dispute_id: dispute_res.id }
    }).catch(() => {});

    toast.success(t("contract.detail.success.disputeRaised"));
    setDisputingMilestone(null);
    setDisputeReason("");
    fetchContract();
    setSubmittingDispute(false);
  };

  const handleSaveEmail = async () => {
    setSavingEmail(true);
    try {
      if (selectedFreelancer) {
        if (selectedFreelancer.id === user.id) {
          toast.error(t("contract.detail.error.selfAssign"));
          setSavingEmail(false);
          return;
        }
        const { error: cError } = await supabase
          .from("contracts")
          .update({ 
            freelancer_id: selectedFreelancer.id, 
            invite_email: selectedFreelancer.email.toLowerCase() 
          })
          .eq("id", id);
          
        if (cError) throw cError;

        const { data: invite } = await supabase
          .from("contract_invites")
          .insert({ 
            contract_id: id, 
            invited_email: selectedFreelancer.email.toLowerCase() 
          })
          .select().single();

        await supabase.from("notifications").insert({
          user_id: selectedFreelancer.id,
          type: "invite",
          title: "contract.notif.newInviteTitle",
          message: "contract.notif.newInviteMsg",
          metadata: { title: contract.title },
          link: `/contracts/${id}`
        });

        await supabase.functions.invoke("send-email", {
          body: { type: "invite", contract_id: id, invite_id: invite?.id }
        });

        toast.success(t("contract.detail.success.assigned", { name: selectedFreelancer.full_name }));
      } else {
        if (!newInviteEmail) {
           toast.error(t("contract.detail.error.searchOrEmail"));
           setSavingEmail(false);
           return;
        }

        if (newInviteEmail.toLowerCase() === user.email?.toLowerCase()) {
          toast.error(t("contract.detail.error.selfAssign"));
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
        
        await supabase.from("contracts").update({ 
          invite_email: newInviteEmail.toLowerCase(),
          freelancer_id: null 
        }).eq("id", id);

        toast.success(t("contract.detail.success.inviteSent"));
      }

      setEditingEmail(false);
      setSelectedFreelancer(null);
      fetchContract();
    } catch (err: any) {
      toast.error(t("contract.detail.error.updateFreelancer") + ": " + err.message);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/invite/${activeInvite?.token || contract?.invite_token}`;
    navigator.clipboard.writeText(link);
    toast.success(t("contract.detail.success.copied"));
  };

  const handleDeleteContract = async () => {
    if (!contract || !user) return;
    if (contract.client_id !== user.id) {
      toast.error(t("contract.detail.error.notAuthorizedDelete"));
      return;
    }

    if (contract.status !== "pending" && contract.status !== "draft") {
      toast.error(t("contract.detail.error.deleteRestricted"));
      return;
    }

    setIsDeleting(true);
    try {
      const { error: msError } = await supabase.from("milestones").delete().eq("contract_id", id);
      if (msError) throw new Error(t("contract.detail.error.deleteMilestones"));

      const { error: cError } = await supabase.from("contracts").delete().eq("id", id);
      if (cError) throw new Error(t("contract.detail.error.deleteContract"));

      toast.success(t("contract.detail.success.deleted"));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(t("contract.detail.error.deleteFailed") + ": " + err.message);
      setIsDeleting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (!contract) return null;

  const releasedAmount = milestones
    .filter((m) => m.status === "completed" || m.status === "released")
    .reduce((s: number, m: any) => s + (m.amount || 0), 0);
  
  const platformFeeVal = contract.platform_fee || (contract.total_amount * 0.02);
  const netEscrow = contract.total_amount - platformFeeVal;
  const escrowAmount = isFunded ? (netEscrow - releasedAmount) : 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto px-4 py-8">

        {!kycVerified && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {t("contract.detail.kycPendingMsg")}
            <button onClick={() => navigate("/profile")} className="underline ml-1">{t("contract.detail.checkStatus")}</button>
          </div>
        )}

        {(contract.status === "pending" || contract.status === "funded") && isInvited && activeInvite && (
          <div className="mb-8 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <CheckCircle className="h-5 w-5" />
                  <h2 className="text-xl">{t("contract.detail.inviteTitle")}</h2>
                </div>
                <p className="text-muted-foreground">
                  {t("contract.detail.inviteMsg", { client: clientName, title: contract.title })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="hero" size="lg" onClick={handleAcceptInvite} disabled={accepting || !kycVerified}>
                  {accepting ? t("common.processing") : t("contract.detail.acceptBtn")}
                </Button>
                <Button variant="ghost" size="lg" onClick={handleDeclineInvite} disabled={accepting} className="text-muted-foreground">
                  {t("common.decline")}
                </Button>
              </div>
            </div>
            {!kycVerified && (
              <p className="mt-3 text-xs text-amber-400">
                {t("contract.detail.kycRequiredToAccept")}
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
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.backToDashboard")}
          </Button>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{contract.title}</h1>
              <Badge variant="outline" className={statusColors[contract.status] || statusColors.draft}>
                {t(`common.status.${contract.status}`, { defaultValue: contract.status })}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("contract.detail.client")}: {clientName} · {t("contract.detail.assignedUser")}:{" "}
            {contract.freelancer_id ? (
              freelancerName
            ) : (
              <span className="text-amber-400 italic">{t("dashboard.awaitingAcceptance")}</span>
            )}
          </p>

          {isClient && contract.status === "pending" && !contract.freelancer_id && (
            <div className="mt-3 space-y-3 max-w-md">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("contract.detail.userAssignment")}</span>
              {editingEmail ? (
                <div className="space-y-3">
                  <UserSearch 
                    excludeUserId={user?.id}
                    onSelect={(selected_u) => {
                      setSelectedFreelancer(selected_u);
                      if (selected_u) setNewInviteEmail(selected_u.email);
                    }}
                    onEmailChange={(email) => {
                      setNewInviteEmail(email);
                      setSelectedFreelancer(null);
                    }}
                    defaultValue={newInviteEmail}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="hero" className="flex-1" onClick={handleSaveEmail} disabled={savingEmail}>
                      {savingEmail ? t("common.processing") : t("contract.detail.assignBtn")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingEmail(false); setNewInviteEmail(contract.invite_email || ""); setSelectedFreelancer(null); }}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-card/50 border border-border rounded-lg px-3 py-2">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-muted-foreground">{t("contract.detail.inviteSentTo")}:</p>
                    <p className="text-sm font-medium truncate text-foreground">{activeInvite?.invited_email || contract.invite_email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingEmail(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors" title={t("contract.detail.changeFreelancer")}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        const toastId = toast.loading(t("contract.detail.resendingInvite"));
                        try {
                          const { error } = await supabase.functions.invoke("send-email", {
                            body: { type: "invite", contract_id: id, invite_id: activeInvite?.id }
                          });
                          if (error) throw error;
                          toast.success(t("contract.detail.success.inviteResent"), { id: toastId });
                        } catch (err: any) {
                          toast.error(t("common.error") + ": " + (err.message || t("common.unknownError")), { id: toastId });
                        }
                      }} 
                      className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                      title={t("contract.detail.resendInvite")}
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
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t("createContract.labelScope")}</h3>
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
                      <h3 className="font-bold text-foreground">{t("contract.detail.disputeCenterTitle")}</h3>
                      <p className="text-xs text-muted-foreground">{t("contract.detail.disputeCenterDesc")}</p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="animate-pulse">{t("contract.detail.activeDispute")}</Badge>
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
                                {t("contract.detail.disputeCenterTitle")}
                              </DialogTitle>
                              <DialogDescription className="text-xs text-muted-foreground mt-1">
                                {t("contract.detail.disputeImmersiveMsg", { id: dispute.id.substring(0,8) })}
                              </DialogDescription>
                            </div>
                          </div>
                          
                          <div className="flex-1 flex overflow-hidden">
                            <div className="w-64 border-r border-border p-6 bg-muted/20 hidden md:block">
                              <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">{t("contract.detail.disputeContext")}</h4>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase">{t("common.contract")}</p>
                                  <p className="text-sm font-semibold">{contract.title}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase">{t("common.reason")}</p>
                                  <p className="text-xs italic mt-1 text-muted-foreground/80">"{dispute.reason}"</p>
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
                                           {isAdminReply ? t("common.admin") : (msg.profiles?.full_name || t("common.user"))}
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
                                   placeholder={t("contract.detail.disputePlaceholder")} 
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
                       <p className="text-[10px] text-muted-foreground font-bold uppercase">{t("contract.detail.disputedMilestone")}</p>
                       <p className="text-sm font-semibold mt-0.5">
                         {milestones.find(m_item => m_item.id === dispute.milestone_id)?.title || milestones.find(m_item => m_item.id === dispute.milestone_id)?.name || "N/A"}
                       </p>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] text-muted-foreground font-bold uppercase">{t("contract.detail.lockedAmount")}</p>
                       <p className="text-sm font-bold text-amber-500 mt-0.5">
                         ${milestones.find(m_item => m_item.id === dispute.milestone_id)?.amount?.toLocaleString()}
                       </p>
                     </div>
                  </div>

                  <div className="p-4 border-b border-border bg-amber-500/[0.03]">
                     <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">{t("contract.detail.disputeReason")}</p>
                     <p className="text-xs italic mt-1 text-foreground/80">"{dispute.reason}"</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background/20">
                     {disputeMessages.length === 0 ? (
                       <div className="py-12 text-center opacity-50">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">{t("contract.detail.noDisputeMessages")}</p>
                       </div>
                     ) : (
                       disputeMessages.map((msg) => {
                         const isMe = msg.user_id === user?.id;
                         const isAdminReply = msg.is_admin_reply;
                         
                         return (
                           <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start animate-in fade-in slide-in-from-bottom-1")}>
                             <div className="flex items-center gap-1.5 mb-1 px-1">
                               <span className={cn("text-[10px] font-bold", isAdminReply ? "text-amber-500" : "text-muted-foreground")}>
                                 {isAdminReply ? t("common.admin") : (msg.profiles?.full_name || t("common.user"))}
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
                       placeholder={t("contract.detail.disputePlaceholderShort")} 
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
                  {t("contract.detail.disputeVisibilityMsg")}
               </p>
              </div>
            )}

            <div className="glass-card p-5">
              <h3 className="mb-4 font-semibold text-foreground">{t("createContract.labelReviewMilestones")}</h3>
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">{t("contract.detail.noMilestones")}</p>
              ) : (
                <div className="space-y-4">
                  {milestones.map((m: any) => {
                    const deliverables = deliverablesByMilestone[m.id] || [];
                    const milestoneTitle = m.title || m.name || t("createContract.milestoneLabel", { num: (m.order_index || 0) + 1 });
                    return (
                      <div key={m.id} className="rounded-lg border border-border bg-card/50 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{milestoneTitle}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">${m.amount?.toLocaleString()}</span>
                            <Badge variant="outline" className={`text-xs ${milestoneStatusColors[m.status] || milestoneStatusColors.pending}`}>
                              {t(`common.status.${m.status}`, { defaultValue: m.status?.replace("_", " ") })}
                            </Badge>
                          </div>
                        </div>

                        {m.due_date && (
                          <p className="mb-3 text-xs text-muted-foreground">
                            {t("createContract.labelMilestoneDueDate")}: {formatDate(m.due_date)}
                          </p>
                        )}

                        {deliverables.length > 0 && (
                          <div className="mb-3 space-y-1 border-t border-border/50 pt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t("contract.detail.deliverables")}</p>
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

                        {(m.submission_note || m.submission_url) && (
                          <div className="mt-4 p-3 rounded bg-primary/5 border border-primary/10 space-y-2">
                            <p className="text-xs font-medium text-primary flex items-center gap-1 uppercase tracking-tight">
                              <FileText className="h-3 w-3" /> {t("contract.detail.submissionDetails")}
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
                                    <Download className="h-3.3 w-3.3" /> {t("contract.detail.downloadAttachment")}
                                  </a>
                                ) : (
                                  <a 
                                    href={m.submission_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs flex items-center gap-1.5 text-blue-400 hover:underline bg-blue-400/10 px-2 py-1 rounded"
                                  >
                                    <ExternalLink className="h-3.3 w-3.3" /> {t("contract.detail.viewLink")}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {submittingMilestoneId === m.id && (
                          <div className="mt-4 p-4 rounded-lg bg-card border border-primary/30 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground uppercase">{t("contract.detail.submissionNote")}</label>
                              <Textarea 
                                placeholder={t("contract.detail.submissionNotePlaceholder")} 
                                value={submissionNote}
                                onChange={(e) => setSubmissionNote(e.target.value)}
                                className="min-h-[80px] bg-background/50 text-sm"
                              />
                            </div>
                            
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase">{t("contract.detail.deliverableLink")}</label>
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
                                <label className="text-xs font-medium text-muted-foreground uppercase">{t("contract.detail.uploadFile")}</label>
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
                                      {submissionFile ? submissionFile.name : t("kyc.clickToUpload")}
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
                                {t("common.cancel")}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="hero" 
                                onClick={() => handleMarkReadyWithSubmission(m.id)}
                                disabled={isUploading}
                              >
                                {isUploading ? t("common.processing") : t("contract.detail.submitReviewBtn")}
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                          {isClient && m.status === "in_review" && contract.status === "active" && (
                            <>
                              <Button size="sm" variant="hero" onClick={() => setReleasingMilestone(m)}>
                                {t("contract.detail.approveReleaseBtn")}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setRequestingRevision(m)}>
                                {t("contract.detail.requestRevisionBtn")}
                              </Button>
                            </>
                          )}

                          {(isClient || isFreelancer) &&
                            ["pending", "in_review", "revision"].includes(m.status) &&
                            contract.status === "active" && m.status !== "disputed" && (
                              <Button size="sm" variant="destructive" onClick={() => setDisputingMilestone(m)}>
                                {t("contract.detail.raiseDisputeBtn")}
                              </Button>
                            )}

                          {isFreelancer && ["pending", "revision"].includes(m.status) && contract.status === "active" && !submittingMilestoneId && (
                            <Button size="sm" variant="hero" onClick={() => setSubmittingMilestoneId(m.id)}>
                              {m.status === "revision" ? t("contract.detail.reSubmitBtn") : t("contract.detail.markReadyBtn")}
                            </Button>
                          )}

                          {m.status === "completed" && (
                            <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> {t("contract.detail.released")}
                            </span>
                          )}
                        </div>

                        {milestoneHistory[m.id] && milestoneHistory[m.id].length > 0 && (
                          <div className="mt-4 border-t border-border/30 pt-3">
                            <button 
                              onClick={() => setExpandedHistory(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mb-2"
                            >
                              <Clock className="h-3 w-3" />
                              {t("contract.detail.viewHistory", { count: milestoneHistory[m.id].length })}
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
                                        {event.type === 'submission' ? t("contract.detail.freelancerSubmitted") : t("contract.detail.clientRequestedRevision")}
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
                                          {event.attachment_url.includes('supabase.co') ? t("contract.detail.downloadAttachment") : t("contract.detail.viewLink")}
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
            {isClient && (contract.status === "pending" || contract.status === "accepted") && !isFunded && (
              <div className="glass-card p-5 border-primary/30 bg-primary/5">
                {contract.status === "pending" ? (
                  <div className="text-center space-y-3 py-4">
                    <div className="mx-auto w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-500" />
                    </div>
                    <p className="text-sm text-muted-foreground px-4">
                      {t("contract.detail.waitingForAcceptance")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4 text-teal-400">
                      <CheckCircle className="h-4 w-4" />
                      <p className="text-sm font-medium">{t("contract.detail.freelancerAcceptedFundNow")}</p>
                    </div>
                    <h3 className="mb-3 font-semibold text-foreground">{t("contract.detail.fundContract")}</h3>
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t("createContract.reviewMilestonesTotal")}</span>
                        <span className="text-foreground">${(contract.total_amount * 0.98).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t("createContract.reviewPlatformFee")}</span>
                        <span className="text-foreground">${(contract.total_amount * 0.02).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-border/50 pt-2 flex justify-between font-semibold text-foreground">
                        <span>{t("contract.detail.totalRequired")}</span>
                        <span>${contract.total_amount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-3 pt-2 border-t border-border/50">
                        <span className="text-muted-foreground">{t("contract.detail.walletBalance")}</span>
                        <span className={walletBalance >= totalRequired ? "text-green-400" : "text-red-400"}>
                          ${walletBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {!kycVerified ? (
                      <p className="text-xs text-amber-400 text-center py-2">
                        {t("contract.detail.kycRequiredToFund")} <button onClick={() => navigate("/profile")} className="underline">{t("contract.detail.checkStatus")}</button>
                      </p>
                    ) : walletBalance >= totalRequired ? (
                      <Button className="w-full" variant="hero" onClick={handleFundContract} disabled={funding}>
                        {funding ? t("common.processing") : t("contract.detail.fundContractBtn")}
                      </Button>
                    ) : (
                      <Button className="w-full" variant="outline" onClick={() => setIsTopUpOpen(true)}>
                        {t("contract.detail.insufficientFundBtn")}
                      </Button>
                    )}
                  </>
                )}
                
                <div className="mt-4 pt-4 border-t border-border/50">
                  <Button 
                    variant="ghost" 
                    className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10" 
                    onClick={handleCancelContract}
                    disabled={funding}
                  >
                    <XCircle className="h-3 w-3 mr-1.5" />
                    {t("contract.detail.cancelContractBtn")}
                  </Button>
                </div>
              </div>
            )}

            <div className="glass-card p-5">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t("contract.detail.escrowStatus")}</h3>
              {isFunded ? (
                <>
                  <p className="text-2xl font-bold text-foreground">${escrowAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {escrowAmount > 0 ? t("contract.detail.fundsHeld") : t("contract.detail.allReleased")}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-amber-400">{t("contract.detail.awaitingDeposit")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("contract.detail.depositRequiredMsg", { amount: contract.total_amount?.toLocaleString() })}
                  </p>
                </>
              )}
            </div>

            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">{t("contract.detail.contractDetails")}</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("createContract.reviewMilestonesTotal")}</span>
                <span className="text-foreground">${(contract.total_amount * 0.98).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("createContract.reviewPlatformFee")}</span>
                <span className="text-foreground">${(contract.total_amount * 0.02).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-2">
                <span className="text-muted-foreground">{t("createContract.labelTotal")}</span>
                <span className="text-foreground">${contract.total_amount?.toLocaleString()}</span>
              </div>
              {contract.deadline && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("createContract.labelDeadline")}</span>
                  <span className="text-foreground">{formatDate(contract.deadline)}</span>
                </div>
              )}
            </div>
 
            <div className="glass-card flex flex-col border-amber-500/20 bg-amber-500/[0.02] relative overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-amber-500/5 flex justify-between items-center">
                   <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                     <ShieldAlert className="h-3 w-3 text-amber-500" />
                     {t("contract.detail.mediationCenter")}
                   </h3>
                </div>

                <div className="p-4 space-y-3">
                   {!dispute ? (
                     <div className="py-4 text-center">
                        <CheckCircle className="h-8 w-8 text-green-500/20 mx-auto mb-2" />
                        <p className="text-[10px] text-muted-foreground italic">{t("contract.detail.noDisputes")}</p>
                     </div>
                   ) : (
                     <div className="space-y-2">
                        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors cursor-pointer group">
                           <Dialog>
                              <DialogTrigger asChild>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter mb-1">
                                      {t("common.dispute")} #{dispute.id.substring(0,8)}
                                    </p>
                                    <p className="text-xs font-semibold text-foreground line-clamp-1">
                                      {milestones.find(m_item => m_item.id === dispute.milestone_id)?.title || milestones.find(m_item => m_item.id === dispute.milestone_id)?.name || t("contract.detail.generalDispute")}
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
                                      {t(`common.status.${dispute.status}`, { defaultValue: dispute.status || 'RESOLVED' })}
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
                                      {t("contract.detail.disputeCenterTitle")}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                                      {dispute.status === 'open' ? t("contract.detail.activeMediation") : t("contract.detail.archivedMediation")} {t("common.dispute")} #{dispute.id.substring(0,8)}
                                    </DialogDescription>
                                  </div>
                                  <Badge variant="outline" className={cn(
                                    "font-bold",
                                    dispute.status === 'open' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                    "bg-green-500/10 text-green-500 border-green-500/20"
                                  )}>
                                    {t(`common.status.${dispute.status}`, { defaultValue: dispute.status?.toUpperCase() || 'RESOLVED' })}
                                  </Badge>
                                </div>
                                
                                <div className="flex-1 flex overflow-hidden">
                                  <div className="w-64 border-r border-border p-6 bg-muted/20 hidden md:block">
                                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">{t("contract.detail.disputeContext")}</h4>
                                    <div className="space-y-4">
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase">{t("common.contract")}</p>
                                        <p className="text-sm font-semibold">{contract.title}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase">{t("common.reason")}</p>
                                        <p className="text-xs italic mt-1 text-muted-foreground/80">"{dispute.reason}"</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground uppercase">{t("common.milestone")}</p>
                                        <p className="text-xs font-medium">
                                          {milestones.find(m_item => m_item.id === dispute.milestone_id)?.title || milestones.find(m_item => m_item.id === dispute.milestone_id)?.name || "N/A"}
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
                                                 {isAdminReply ? t("common.admin") : (msg.profiles?.full_name || t("common.user"))}
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
                                           placeholder={t("contract.detail.disputePlaceholder")} 
                                           className="flex-1 h-11 bg-background/50 border-border focus:border-primary/50 transition-all shadow-inner"
                                           value={newDisputeMessage}
                                           onChange={(e) => setNewDisputeMessage(e.target.value)}
                                         />
                                         <Button type="submit" size="icon" className="h-11 w-11 shadow-lg shadow-primary/20" disabled={!newDisputeMessage.trim()}>
                                           <Send className="h-5 w-5" />
                                         </Button>
                                      </form>
                                    ) : null}
                                  </div>
                                </div>
                              </DialogContent>
                           </Dialog>
                        </div>
                     </div>
                   )}
                </div>
             </div>

            {isClient && ["draft", "pending", "accepted", "revision_requested"].includes(contract.status) && (
              <div className="mt-8 flex justify-between items-center pt-8 border-t border-border/50">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{t("contract.detail.dangerZone")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("contract.detail.dangerZoneDesc")}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDeleteContract}
                  disabled={isDeleting}
                >
                  {isDeleting ? t("common.processing") : t("contract.detail.deleteContractBtn")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!releasingMilestone} onOpenChange={() => setReleasingMilestone(null)}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("contract.detail.confirmReleaseTitle")}</DialogTitle>
            <DialogDescription>
              {t("contract.detail.confirmReleaseMsg", { amount: releasingMilestone?.amount?.toLocaleString(), milestone: releasingMilestone?.title || releasingMilestone?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setReleasingMilestone(null)}>{t("common.cancel")}</Button>
            <Button variant="hero" onClick={executeApprove} disabled={funding}>
              {funding ? t("common.processing") : t("contract.detail.confirmReleaseBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!disputingMilestone} onOpenChange={() => setDisputingMilestone(null)}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("contract.detail.raiseDisputeTitle")}</DialogTitle>
            <DialogDescription>
              {t("contract.detail.raiseDisputeMsg", { milestone: disputingMilestone?.title || disputingMilestone?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label>{t("contract.detail.disputeReasonLabel")}</Label>
            <Textarea 
              placeholder={t("contract.detail.disputeReasonPlaceholder")}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-[10px] text-muted-foreground italic">
              {t("contract.detail.disputeFreezeMsg")}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDisputingMilestone(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleSubmitDispute} disabled={submittingDispute}>
              {submittingDispute ? t("common.submitting") : t("contract.detail.confirmDisputeBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!requestingRevision} onOpenChange={() => setRequestingRevision(null)}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("contract.detail.requestRevisionTitle")}</DialogTitle>
            <DialogDescription>
              {t("contract.detail.requestRevisionDesc", { milestone: requestingRevision?.title || requestingRevision?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label>{t("contract.detail.feedbackLabel")}</Label>
            <Textarea 
              placeholder={t("contract.detail.feedbackPlaceholder")}
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRequestingRevision(null)}>{t("common.cancel")}</Button>
            <Button variant="hero" onClick={executeRequestRevision}>
              {t("contract.detail.sendRevisionBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TopUpModal 
        isOpen={isTopUpOpen} 
        onClose={() => setIsTopUpOpen(false)} 
        onSuccess={() => {
          setIsTopUpOpen(false);
          fetchContract();
        }} 
      />
    </div>
  );
};

export default ContractDetail;