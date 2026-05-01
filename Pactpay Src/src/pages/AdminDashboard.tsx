import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import {
  Users, AlertTriangle,
  Search, ShieldAlert, CheckCircle2, CheckCircle, XCircle, MoreVertical,
  ShieldCheck, Copy, ArrowRightLeft, Check, X, ImageIcon, Lock,
  DollarSign, TrendingUp, Send, MessageSquareText, Bell, FileText, Scale
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  // Data states
  const [contracts, setContracts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);

  // KYC Review Modal
  const [kycUser, setKycUser] = useState<any>(null);
  const [kycUrls, setKycUrls] = useState<{ front: string | null; back: string | null; selfie: string | null }>({ front: null, back: null, selfie: null });

  // Filtering states
  const [userSearch, setUserSearch] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [disputeSearch, setDisputeSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");

  const [userFilter, setUserFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [txFilter, setTxFilter] = useState("all");
  const [disputeFilter, setDisputeFilter] = useState("all");
  const [ticketFilter, setTicketFilter] = useState("all");
  const [kycAction, setKycAction] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [activeTab, setActiveTab] = useState("disputes");
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedAdminTicket, setSelectedAdminTicket] = useState<any>(null);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [newAdminReply, setNewAdminReply] = useState("");
  const [selectedAdminDispute, setSelectedAdminDispute] = useState<any>(null);
  const [disputeMessages, setDisputeMessages] = useState<any[]>([]);
  const [newDisputeReply, setNewDisputeReply] = useState("");

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clientPercent, setClientPercent] = useState(0);
  const [freelancerPercent, setFreelancerPercent] = useState(100);
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/auth");
      else checkAdmin();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin && user) {
      fetchNotifications();
      
      const channel = supabase
        .channel('admin-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 5));
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [isAdmin, user]);

  const fetchNotifications = async () => {
    const { data, count } = await supabase
      .from("notifications")
      .select("*", { count: 'exact' })
      .eq("user_id", user?.id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5);
    
    setNotifications(data || []);
    setUnreadCount(count || 0);
  };

  const markAllAsRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user?.id);
    setNotifications([]);
    setUnreadCount(0);
  };

  const checkAdmin = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user?.id).maybeSingle();

      const isUserAdmin = profile?.is_admin || user?.user_metadata?.role === 'admin' || user?.email === 'admin@pactpay.com';

      if (!isUserAdmin) {
        toast.error(t("admin.error.unauthorized"));
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      fetchAllData();
    } catch (err: any) {
      console.error("Admin check failed:", err);
      toast.error(t("admin.error.verifyFailed") + ": " + err.message);
      navigate("/dashboard");
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [cRes, uRes, dRes, tRes, tickRes, mRes] = await Promise.all([
        supabase.from("contracts").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("disputes").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("support_tickets").select("*, profiles(full_name, email)").order("updated_at", { ascending: false }),
        supabase.from("milestones").select("*")
      ]);

      if (cRes.error) throw cRes.error;
      if (uRes.error) throw uRes.error;
      if (dRes.error) throw dRes.error;
      if (tRes.error) throw tRes.error;
      if (tickRes.error) throw tickRes.error;
      if (mRes.error) throw mRes.error;

      setContracts(cRes.data || []);
      setUsers(uRes.data || []);
      setDisputes(dRes.data || []);
      setTransactions(tRes.data || []);
      setMilestones(mRes.data || []);
      setTickets(tickRes.data || []);

    } catch (err: any) {
      console.error("Failed to fetch admin data:", err);
      toast.error(t("admin.error.fetchFailed") + ": " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    pendingKYCs: users.filter(u => !u.kyc_verified && u.id_doc_front_url).length,
    openDisputes: disputes.filter(d => d.status === 'open').length,
    pendingWithdrawals: transactions.filter(tr => tr.type === 'withdrawal' && tr.metadata?.status === 'pending').length,
    unreadTickets: tickets.filter(ti => ti.status === 'open').length,
  };

  const fetchAdminMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setAdminMessages(data || []);
  };

  const fetchDisputeMessages = async (disputeId: string) => {
    const { data } = await supabase
      .from("dispute_messages")
      .select("*, profiles(full_name)")
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: true });
    setDisputeMessages(data || []);
  };

  useEffect(() => {
    if (isAdmin) {
      const ticketChannel = supabase
        .channel('global-admin-tickets')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        }, () => {
          fetchAllData();
        })
        .subscribe();

      const disputeChannel = supabase
        .channel('global-admin-disputes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'disputes'
        }, () => fetchAllData())
        .subscribe();

      return () => { 
        supabase.removeChannel(ticketChannel);
        supabase.removeChannel(disputeChannel);
      };
    }
  }, [isAdmin, selectedAdminTicket?.id]);

  useEffect(() => {
    if (selectedAdminTicket) {
      fetchAdminMessages(selectedAdminTicket.id);

      const channel = supabase
        .channel(`admin-ticket-${selectedAdminTicket.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${selectedAdminTicket.id}`
        }, (payload) => {
          setAdminMessages(prev => [...prev, payload.new]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedAdminTicket]);

  useEffect(() => {
    if (selectedAdminDispute) {
      fetchDisputeMessages(selectedAdminDispute.id);

      const channel = supabase
        .channel(`admin-dispute-${selectedAdminDispute.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'dispute_messages',
          filter: `dispute_id=eq.${selectedAdminDispute.id}`
        }, () => fetchDisputeMessages(selectedAdminDispute.id))
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedAdminDispute]);

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminReply.trim() || !selectedAdminTicket) return;

    const msg = newAdminReply;
    setNewAdminReply("");

    await supabase.from("support_messages").insert({
      ticket_id: selectedAdminTicket.id,
      sender_id: user!.id,
      message: msg,
      is_admin_reply: true
    });

    await supabase.from("support_tickets").update({
      status: 'pending user',
      updated_at: new Date().toISOString()
    }).eq("id", selectedAdminTicket.id);

    await supabase.from("notifications").insert({
      user_id: selectedAdminTicket.user_id,
      title: t("admin.notif.supportReplyTitle"),
      message: t("admin.notif.supportReplyMsg"),
      type: "system",
      link: "/support"
    });
  };

  const handleSendDisputeReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisputeReply.trim() || !selectedAdminDispute) return;

    const msg = newDisputeReply;
    setNewDisputeReply("");

    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      dispute_id: selectedAdminDispute.id,
      user_id: user?.id,
      message: msg,
      is_admin_reply: true,
      created_at: new Date().toISOString(),
      profiles: { full_name: t("common.admin") }
    };
    setDisputeMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from("dispute_messages").insert({
      dispute_id: selectedAdminDispute.id,
      user_id: user?.id,
      message: msg,
      is_admin_reply: true
    });

    if (error) {
      toast.error(t("admin.error.sendReply") + ": " + error.message);
      setDisputeMessages(prev => prev.filter(m_item => m_item.id !== optimisticMsg.id));
    } else {
      fetchDisputeMessages(selectedAdminDispute.id);
    }

    const contract = contracts.find(c_item => c_item.id === selectedAdminDispute.contract_id);
    if (contract) {
      const parties = [contract.client_id, contract.freelancer_id].filter(Boolean);
      const notifications_list = parties.map(pid => ({
        user_id: pid,
        title: t("admin.notif.disputeUpdateTitle"),
        message: t("admin.notif.disputeUpdateMsg"),
        type: "system",
        link: `/contracts/${contract.id}`
      }));
      
      const { error: nError } = await supabase.from("notifications").insert(notifications_list);
      if (nError) {
        toast.error(t("admin.error.notifyParties") + ": " + nError.message);
      }
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedAdminDispute || !resolutionNotes.trim()) {
      toast.error("Please provide resolution notes");
      return;
    }
    
    setResolving(true);
    try {
      const milestone_val = milestones.find(m => m.id === selectedAdminDispute.milestone_id);
      const contract_val = contracts.find(c => c.id === selectedAdminDispute.contract_id);
      
      if (!milestone_val || !contract_val) throw new Error(t("admin.error.relatedDataMissing"));
      
      const totalAmount = milestone_val.amount;
      const clientAmount = (totalAmount * clientPercent) / 100;
      const freelancerAmount = (totalAmount * freelancerPercent) / 100;
      
      // Credit client refund
      if (clientAmount > 0) {
        const { error: clientError } = await supabase.rpc("update_wallet_and_log", {
          p_user_id: contract_val.client_id,
          p_amount: clientAmount,
          p_type: 'refund',
          p_contract_id: contract_val.id,
          p_milestone_id: milestone_val.id
        });
        if (clientError) throw clientError;
      }
      
      // Credit freelancer payout
      if (freelancerAmount > 0) {
        const { error: freelancerError } = await supabase.rpc("update_wallet_and_log", {
          p_user_id: contract_val.freelancer_id,
          p_amount: freelancerAmount,
          p_type: 'release',
          p_contract_id: contract_val.id,
          p_milestone_id: milestone_val.id
        });
        if (freelancerError) throw freelancerError;
      }
      
      // Update dispute record
      const { error: disputeErr } = await supabase
        .from("disputes")
        .update({ 
          status: "resolved",
          resolution_notes: resolutionNotes,
          client_refund_amount: clientAmount,
          freelancer_payout_amount: freelancerAmount
        })
        .eq("id", selectedAdminDispute.id);
      
      if (disputeErr) throw disputeErr;
      
      // Update milestone status
      await supabase.from("milestones").update({ 
        status: freelancerPercent === 0 ? "cancelled" : "completed",
        released_at: freelancerPercent > 0 ? new Date().toISOString() : null
      }).eq("id", milestone_val.id);
      
      // Update contract status if all milestones are done
      const { data: allMs } = await supabase.from("milestones").select("status").eq("contract_id", contract_val.id);
      const allDone = allMs?.every((m: any) => m.status === "completed" || m.status === "cancelled");
      await supabase.from("contracts").update({ status: allDone ? "completed" : "active" }).eq("id", contract_val.id);

      // Notify both parties
      const participants = [
        { id: contract_val.freelancer_id, title: t("admin.notif.disputeResolvedTitle"), msg: t("admin.notif.disputeResolvedFreelancer", { title: milestone_val.title || milestone_val.name, resolution: `${freelancerPercent}%` }) },
        { id: contract_val.client_id, title: t("admin.notif.disputeResolvedTitle"), msg: t("admin.notif.disputeResolvedClient", { title: milestone_val.title || milestone_val.name, resolution: `${clientPercent}%` }) }
      ];

      for (const p of participants) {
        if (p.id) {
          await supabase.from("notifications").insert({
            user_id: p.id,
            type: "system",
            title: p.title,
            message: p.msg,
            link: `/contracts/${contract_val.id}`
          });
        }
      }

      toast.success(t("admin.success.disputeResolved", { resolution: `${clientPercent}/${freelancerPercent}` }));
      setSelectedAdminDispute(null);
      setResolutionNotes("");
      setClientPercent(0);
      setFreelancerPercent(100);
      fetchAllData();
    } catch (err: any) {
      console.error("Dispute resolution failed:", err);
      toast.error(t("admin.error.resolutionFailed") + ": " + err.message);
    } finally {
      setResolving(false);
    }
  };

  const openKycModal = async (u: any) => {
    setKycUser(u);
    setKycUrls({ front: null, back: null, selfie: null });
    setShowRejectInput(false);
    setRejectReason("");

    const getUrl = async (path: string | null) => {
      if (!path) return null;
      const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 3600);
      return data?.signedUrl || null;
    };

    const [front, back, selfie] = await Promise.all([
      getUrl(u.id_doc_front_url),
      getUrl(u.id_doc_back_url),
      getUrl(u.id_selfie_url),
    ]);
    setKycUrls({ front, back, selfie });
  };

  const handleApprove = async () => {
    if (!kycUser) return;
    setKycAction(true);
    const { error } = await supabase.from("profiles").update({ kyc_verified: true }).eq("id", kycUser.id);
    if (error) toast.error(t("admin.error.approveKYC") + ": " + error.message);
    else { toast.success(t("admin.success.kycApproved", { name: kycUser.full_name || kycUser.id })); fetchAllData(); setKycUser(null); }
    setKycAction(false);
  };

  const handleApproveWithdrawal = async (tx_item: any) => {
    try {
      const updatedMetadata = { ...tx_item.metadata, status: 'completed' };
      const { error } = await supabase.from('transactions').update({ metadata: updatedMetadata }).eq('id', tx_item.id);
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: tx_item.from_user_id,
        type: 'withdrawal_approved',
        message: t("admin.notif.withdrawalApprovedMsg", { amount: tx_item.amount.toLocaleString() })
      });

      toast.success(t("admin.success.withdrawalApproved"));
      fetchAllData();
    } catch (err: any) {
      toast.error(err.message || t("admin.error.approveWithdrawal"));
    }
  };

  const handleRejectWithdrawal = async (tx_item: any) => {
    try {
      const updatedMetadata = { ...tx_item.metadata, status: 'failed', rejection_reason: 'Admin rejected' };

      const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', tx_item.from_user_id).single();
      if (profile) {
        await supabase.from('profiles').update({ wallet_balance: (profile.wallet_balance || 0) + tx_item.amount }).eq('id', tx_item.from_user_id);
      }

      const { error } = await supabase.from('transactions').update({ metadata: updatedMetadata }).eq('id', tx_item.id);
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: tx_item.from_user_id,
        type: 'withdrawal_rejected',
        message: t("admin.notif.withdrawalRejectedMsg", { amount: tx_item.amount.toLocaleString() })
      });

      toast.success(t("admin.success.withdrawalRejected"));
      fetchAllData();
    } catch (err: any) {
      toast.error(err.message || t("admin.error.rejectWithdrawal"));
    }
  };

  const handleReject = async () => {
    if (!kycUser) return;
    if (!rejectReason.trim()) { toast.error(t("admin.error.rejectionReasonRequired")); return; }
    setKycAction(true);
    const { error } = await supabase.from("profiles").update({ kyc_verified: false }).eq("id", kycUser.id);
    if (error) toast.error(t("admin.error.rejectKYC") + ": " + error.message);
    else { toast.success(t("admin.success.kycRejected", { name: kycUser.full_name || kycUser.id })); fetchAllData(); setKycUser(null); }
    setKycAction(false);
  };

  const handleUpdateUserStatus = async (targetUserId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: newStatus })
        .eq("id", targetUserId);

      if (error) throw error;

      toast.success(t("admin.success.userStatusUpdated", { status: newStatus }));
      fetchAllData();
    } catch (err: any) {
      toast.error(t("admin.error.updateStatus") + ": " + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const DocPreview = ({ url, label }: { url: string | null; label: string }) => (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {url ? (
        url.includes(".pdf") ? (
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted transition-colors text-sm text-primary">
            <FileText className="h-4 w-4" /> {t("admin.kyc.viewPDF")}
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="block cursor-pointer group hover:opacity-80 transition-opacity">
            <img
              src={url}
              alt={label}
              className="w-full max-h-48 rounded-lg object-contain border border-border group-hover:border-primary/50"
            />
          </a>
        )
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" /> {t("admin.kyc.notUploaded")}
        </div>
      )}
    </div>
  );

  if (loading || authLoading || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-background">{t("admin.loading")}</div>;
  }

  const totalRevenue = transactions.filter(tr => tr.type === "fee").reduce((sum, tr) => sum + tr.amount, 0);
  const totalPayouts = transactions.filter(tr => tr.type === "revenue_payout").reduce((sum, tr) => sum + tr.amount, 0);
  const netEarnings = totalRevenue - totalPayouts;

  const totalEscrowIn = transactions.filter(tr => tr.type === "escrow").reduce((sum, tr) => sum + tr.amount, 0);
  const totalEscrowOut = transactions.filter(tr => tr.type === "release" || tr.type === "refund").reduce((sum, tr) => sum + tr.amount, 0);
  const activeEscrow = totalEscrowIn - totalEscrowOut;

  const totalLiquidity = users.reduce((sum, u_item) => sum + (u_item.wallet_balance || 0), 0);

  const handleFeePayout = async () => {
    const amountStr = prompt(t("admin.prompt.feePayout", { amount: netEarnings.toLocaleString() }));
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("admin.error.invalidAmount"));
      return;
    }

    if (amount > netEarnings) {
      toast.error(t("admin.error.insufficientEarnings"));
      return;
    }

    try {
      const { data, error } = await supabase.rpc('process_fee_payout', {
        p_admin_id: user?.id,
        p_amount: amount,
        p_metadata: { category: 'admin_withdrawal', reason: 'Platform fee payout' }
      });

      if (error) throw error;
      if (data?.success === false) throw new Error(data.message);

      toast.success(t("admin.success.withdrawn", { amount: amount.toLocaleString() }));
      fetchAllData();
    } catch (err: any) {
      toast.error(err.message || t("admin.error.processPayout"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t("admin.title")}</h1>
              <p className="text-muted-foreground mt-1">{t("admin.subtitle")}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 transition-colors h-11 w-11 rounded-full border border-border/50">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white border-2 border-background shadow-lg">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-primary/20 shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("admin.alerts.title")}</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-[10px] font-bold text-primary hover:underline">
                        {t("admin.alerts.clearAll")}
                      </button>
                    )}
                  </div>
                  <DropdownMenuSeparator className="m-0" />
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center space-y-3">
                        <div className="mx-auto h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
                          <Bell className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">{t("admin.alerts.noNew")}</p>
                      </div>
                    ) : (
                      notifications.map((n_item) => (
                        <DropdownMenuItem 
                          key={n_item.id} 
                          className="flex flex-col items-start p-4 gap-1 cursor-pointer border-b last:border-0 hover:bg-muted/30 focus:bg-muted/30 outline-none"
                          onSelect={() => {
                            if (n_item.link) {
                              if (n_item.link === "/admin") {
                                if (n_item.type === "dispute") setActiveTab("disputes");
                                else if (n_item.type === "support") setActiveTab("support");
                              } else {
                                navigate(n_item.link);
                              }
                            }
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">{n_item.type}</span>
                            <span className="text-[10px] text-muted-foreground italic">{t("common.justNow")}</span>
                          </div>
                          <span className="text-xs font-bold text-foreground line-clamp-1">{n_item.title || t("admin.alerts.systemAlert")}</span>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{n_item.message}</p>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="hero"
                onClick={handleFeePayout}
                className="gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 h-11"
                disabled={netEarnings <= 0}
              >
                <TrendingUp className="h-4 w-4" /> {t("admin.withdrawFeesBtn")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div 
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer",
                stats.openDisputes > 0 ? "bg-destructive/5 border-destructive/20 hover:bg-destructive/10" : "bg-muted/10 border-border"
              )}
              onClick={() => setActiveTab("disputes")}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stats.openDisputes > 0 ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground")}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">{t("admin.stats.openDisputes")}</p>
                  <p className="text-xl font-bold">{stats.openDisputes}</p>
                </div>
              </div>
            </div>

            <div 
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer",
                stats.pendingKYCs > 0 ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10" : "bg-muted/10 border-border"
              )}
              onClick={() => setActiveTab("users")}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stats.pendingKYCs > 0 ? "bg-amber-500/20 text-amber-500" : "bg-muted text-muted-foreground")}>
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">{t("admin.stats.kycPending")}</p>
                  <p className="text-xl font-bold">{stats.pendingKYCs}</p>
                </div>
              </div>
            </div>

            <div 
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer",
                stats.pendingWithdrawals > 0 ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10" : "bg-muted/10 border-border"
              )}
              onClick={() => setActiveTab("transactions")}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stats.pendingWithdrawals > 0 ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground")}>
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">{t("admin.stats.pendingPayouts")}</p>
                  <p className="text-xl font-bold">{stats.pendingWithdrawals}</p>
                </div>
              </div>
            </div>

            <div 
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer",
                stats.unreadTickets > 0 ? "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10" : "bg-muted/10 border-border"
              )}
              onClick={() => setActiveTab("support")}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stats.unreadTickets > 0 ? "bg-blue-500/20 text-blue-500" : "bg-muted text-muted-foreground")}>
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">{t("admin.stats.supportNeeded")}</p>
                  <p className="text-xl font-bold">{stats.unreadTickets}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 border-primary/20 bg-primary/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-3 w-3" /> {t("admin.stats.totalLiquidity")}
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">${totalLiquidity.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">USD</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{t("admin.stats.totalLiquidityDesc")}</p>
            </div>

            <div className="glass-card p-5 border-warning/20 bg-warning/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-3 w-3" /> {t("admin.stats.activeEscrow")}
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-warning">${activeEscrow.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">USD</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{t("admin.stats.activeEscrowDesc")}</p>
            </div>

            <div className="glass-card p-5 border-success/20 bg-success/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3 w-3" /> {t("admin.stats.netEarnings")}
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-success">${netEarnings.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">{t("common.available")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{t("admin.stats.netEarningsDesc")}</p>
            </div>

            <div className="glass-card p-5 border-status-active/20 bg-status-active/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <Users className="h-3 w-3" /> {t("admin.stats.totalUsers")}
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-status-active">{users.length.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">{t("common.status.active")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{t("admin.stats.totalUsersDesc")}</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="horizontal-scroll-indicator">
            <TabsList className="bg-card glass-card inline-flex w-auto min-w-full">
              <TabsTrigger value="disputes">{t("admin.tabs.disputes")} ({disputes.filter(d => d.status === 'open').length})</TabsTrigger>
              <TabsTrigger value="contracts">{t("admin.tabs.contracts")} ({contracts.length})</TabsTrigger>
              <TabsTrigger value="users">{t("admin.tabs.users")} ({users.length})</TabsTrigger>
              <TabsTrigger value="transactions">{t("admin.tabs.transactions")} ({transactions.length})</TabsTrigger>
              <TabsTrigger value="support">{t("admin.tabs.support")} ({tickets.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="disputes" className="glass-card p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
              <div className="lg:col-span-4 border-r border-border/50 pr-4 flex flex-col">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-1">{t("admin.disputes.title")}</h2>
                  <p className="text-xs text-muted-foreground mb-3">{t("admin.disputes.subtitle")}</p>

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("admin.disputes.searchPlaceholder")}
                      className="pl-9 h-8 text-xs bg-muted/20"
                      value={disputeSearch}
                      onChange={(e) => setDisputeSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {["all", "open", "resolved"].map((s_item) => (
                      <button
                        key={s_item}
                        onClick={() => setDisputeFilter(s_item)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all capitalize",
                          disputeFilter === s_item
                            ? "bg-primary/20 text-primary border-primary/50"
                            : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50"
                        )}
                      >
                        {t(`common.status.${s_item}`, { defaultValue: s_item })}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-2">
                  {disputes.filter(d_item => {
                    const contractTitle = contracts.find(c_item => c_item.id === d_item.contract_id)?.title || "";
                    const matchesStatus = disputeFilter === 'all' || d_item.status === disputeFilter;
                    const searchLower = disputeSearch.toLowerCase();
                    const matchesSearch =
                      contractTitle.toLowerCase().includes(searchLower) ||
                      (d_item.reason || "").toLowerCase().includes(searchLower);
                    return matchesStatus && matchesSearch;
                  }).length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground italic text-sm">
                      {t("admin.disputes.none")}
                    </div>
                  ) : (
                    disputes
                      .filter(d_item => {
                        const contractTitle = contracts.find(c_item => c_item.id === d_item.contract_id)?.title || "";
                        const matchesStatus = disputeFilter === 'all' || d_item.status === disputeFilter;
                        const searchLower = disputeSearch.toLowerCase();
                        const matchesSearch =
                          contractTitle.toLowerCase().includes(searchLower) ||
                          (d_item.reason || "").toLowerCase().includes(searchLower);
                        return matchesStatus && matchesSearch;
                      })
                      .map((d_item) => {
                        const relatedContract = contracts.find(c_item => c_item.id === d_item.contract_id);
                        return (
                          <div
                            key={d_item.id}
                            onClick={() => setSelectedAdminDispute(d_item)}
                            className={cn(
                              "p-3 rounded-lg border border-border/50 cursor-pointer transition-all hover:bg-muted/50",
                              selectedAdminDispute?.id === d_item.id ? "bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20" : ""
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-bold truncate pr-2">{relatedContract?.title || t("common.contract")}</span>
                              <Badge variant={d_item.status === 'open' ? "destructive" : "outline"} className="text-[10px] px-1.5 py-0 capitalize">
                                {t(`common.status.${d_item.status}`, { defaultValue: d_item.status })}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate mb-1 italic">"{d_item.reason}"</p>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground/60">
                               <span>ID: {d_item.id.slice(0, 8)}</span>
                               <span>{new Date(d_item.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="lg:col-span-8 flex flex-col h-full bg-muted/10 rounded-xl overflow-hidden relative">
                {!selectedAdminDispute ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30">
                    <ShieldAlert className="h-16 w-16 mb-4" />
                    <p>{t("admin.disputes.selectMsg")}</p>
                  </div>
                ) : (() => {
                  const contract_val = contracts.find(c_item => c_item.id === selectedAdminDispute.contract_id);
                  const milestone_val = milestones.find(m_item => m_item.id === selectedAdminDispute.milestone_id);
                  const client_val = users.find(u_item => u_item.id === contract_val?.client_id);
                  const freelancer_val = users.find(u_item => u_item.id === contract_val?.freelancer_id);

                  return (
                    <>
                      <div className="p-6 bg-background/50 border-b border-border flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-6">
                          <h3 className="text-lg font-bold truncate mb-2">{contract_val?.title} - {t("common.dispute")}</h3>
                          <div className="flex flex-wrap items-center gap-3">
                             <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] max-w-[300px] truncate block py-1">
                               {t("common.milestone")}: {milestone_val?.title || milestone_val?.name || "N/A"}
                             </Badge>
                             <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                <DollarSign className="h-3 w-3 text-amber-500" />
                                <span className="text-[10px] font-bold text-amber-500">{milestone_val?.amount?.toLocaleString()} {t("admin.disputes.locked")}</span>
                             </div>
                          </div>
                        </div>
                        <div className="flex gap-4 items-center shrink-0">
                          {selectedAdminDispute.status === "open" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="hero" className="h-9 px-4 shadow-lg shadow-primary/20 gap-2">
                                  <Scale className="h-4 w-4" /> {t("admin.disputes.resolveBtn", { defaultValue: "Resolve Dispute" })}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px] glass-card border-border/50">
                                <DialogHeader>
                                  <DialogTitle>{t("admin.disputes.resolveTitle", { defaultValue: "Resolve Dispute" })}</DialogTitle>
                                  <DialogDescription>
                                    {t("admin.disputes.resolveDesc", { defaultValue: "Specify the settlement split between the parties." })}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 py-4">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm font-medium">
                                      <span className="text-blue-500">{t("common.client")}: {clientPercent}%</span>
                                      <span className="text-green-500">{t("common.freelancer")}: {freelancerPercent}%</span>
                                    </div>
                                    <Slider
                                      value={[clientPercent]}
                                      max={100}
                                      step={5}
                                      onValueChange={(vals) => {
                                        setClientPercent(vals[0]);
                                        setFreelancerPercent(100 - vals[0]);
                                      }}
                                      className="py-4"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                      <Button size="xs" variant="outline" className="text-[10px] h-7" onClick={() => { setClientPercent(100); setFreelancerPercent(0); }}>
                                        100% Client
                                      </Button>
                                      <Button size="xs" variant="outline" className="text-[10px] h-7" onClick={() => { setClientPercent(0); setFreelancerPercent(100); }}>
                                        100% Freelancer
                                      </Button>
                                      <Button size="xs" variant="outline" className="text-[10px] h-7" onClick={() => { setClientPercent(50); setFreelancerPercent(50); }}>
                                        50/50 Split
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="grid gap-2">
                                    <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                      {t("admin.disputes.adminNotes", { defaultValue: "Resolution Summary & Notes" })}
                                    </Label>
                                    <Textarea
                                      id="notes"
                                      placeholder={t("admin.disputes.notesPlaceholder", { defaultValue: "Explain the reasoning for this split decision..." })}
                                      value={resolutionNotes}
                                      onChange={(e) => setResolutionNotes(e.target.value)}
                                      className="min-h-[100px] text-sm bg-muted/20"
                                    />
                                  </div>

                                  <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="text-muted-foreground">{t("admin.disputes.clientTotal", { defaultValue: "Client gets" })}:</span>
                                      <span className="font-bold text-blue-500">${((milestone_val?.amount || 0) * clientPercent / 100).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">{t("admin.disputes.freelancerTotal", { defaultValue: "Freelancer gets" })}:</span>
                                      <span className="font-bold text-green-500">${((milestone_val?.amount || 0) * freelancerPercent / 100).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button className="w-full" onClick={handleResolveDispute} disabled={resolving || !resolutionNotes.trim()}>
                                    {resolving ? t("common.processing") : t("admin.disputes.confirmBtn", { defaultValue: "Finalize Resolution" })}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                          <button
                            onClick={() => setSelectedAdminDispute(null)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-border"
                            title={t("common.close")}
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-500/5 border-b border-amber-500/10">
                         <p className="text-[10px] text-muted-foreground font-medium uppercase mb-1">{t("admin.disputes.reasonLabel")}:</p>
                         <p className="text-xs italic text-foreground bg-background/50 p-2 rounded border border-amber-500/10">
                           {selectedAdminDispute.reason}
                         </p>
                         <div className="flex gap-4 mt-2">
                            <div className="text-[10px]"><span className="text-muted-foreground">{t("common.client")}:</span> <span className="font-medium">{client_val?.full_name}</span></div>
                            <div className="text-[10px]"><span className="text-muted-foreground">{t("common.freelancer")}:</span> <span className="font-medium">{freelancer_val?.full_name}</span></div>
                         </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {disputeMessages.length === 0 ? (
                          <div className="py-12 text-center">
                            <p className="text-xs text-muted-foreground italic">{t("admin.disputes.noMessages")}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{t("admin.disputes.startConversation")}</p>
                          </div>
                        ) : (
                          disputeMessages.map((msg_item) => {
                            const isMe = msg_item.user_id === user?.id;
                            const isClientMsg = msg_item.user_id === contract_val?.client_id;
                            const isFreelancerMsg = msg_item.user_id === contract_val?.freelancer_id;
                            
                            return (
                              <div key={msg_item.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                <div className="flex items-center gap-1.5 mb-1 px-1">
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    {isMe ? t("admin.disputes.youAdmin") : 
                                     isClientMsg ? `${client_val?.full_name} (${t("common.client")})` : 
                                     isFreelancerMsg ? `${freelancer_val?.full_name} (${t("common.freelancer")})` :
                                     (msg_item.profiles?.full_name || t("common.user"))}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground/50">
                                    {new Date(msg_item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className={cn(
                                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                  isMe ? "bg-primary text-white rounded-tr-none" : 
                                  isClientMsg ? "bg-blue-500/10 text-foreground border border-blue-500/20 rounded-tl-none" :
                                  isFreelancerMsg ? "bg-green-500/10 text-foreground border border-green-500/20 rounded-tl-none" :
                                  "bg-card text-foreground rounded-tl-none border border-border"
                                )}>
                                  {msg_item.message}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {selectedAdminDispute.status === "open" && (
                        <div className="p-4 bg-background/50 border-t border-border">
                          <form onSubmit={handleSendDisputeReply} className="flex gap-2">
                            <Input
                              placeholder={t("admin.disputes.replyPlaceholder")}
                              className="flex-1"
                              value={newDisputeReply}
                              onChange={(e) => setNewDisputeReply(e.target.value)}
                            />
                            <Button type="submit" size="icon" disabled={!newDisputeReply.trim()}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </form>
                          <p className="text-[10px] text-muted-foreground mt-2 text-center">
                            {t("admin.disputes.visibilityMsg")}
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contracts" className="glass-card p-6">
            <div className="mb-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">{t("admin.contracts.title")}</h2>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("admin.contracts.searchPlaceholder")}
                    className="pl-9"
                    value={contractSearch}
                    onChange={(e) => setContractSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "pending", "active", "completed", "cancelled"].map((s_item) => (
                  <Button
                    key={s_item}
                    size="sm"
                    variant={contractFilter === s_item ? "hero" : "outline"}
                    className="capitalize"
                    onClick={() => setContractFilter(s_item)}
                  >
                    {t(`common.status.${s_item}`, { defaultValue: s_item })}
                  </Button>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border overflow-hidden horizontal-scroll-indicator">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>{t("common.title")}</TableHead>
                    <TableHead>{t("common.status.label")}</TableHead>
                    <TableHead>{t("common.amount")}</TableHead>
                    <TableHead>{t("common.client")}</TableHead>
                    <TableHead>{t("common.freelancer")}</TableHead>
                    <TableHead>{t("common.created")}</TableHead>
                    <TableHead>{t("common.lastUpdate")}</TableHead>
                    <TableHead>{t("common.completionDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts
                    .filter(c_item => {
                      const client_val = users.find(u_item => u_item.id === c_item.client_id);
                      const freelancer_val = c_item.freelancer_id ? users.find(u_item => u_item.id === c_item.freelancer_id) : null;
                      const searchLower = contractSearch.toLowerCase();
                      
                      const matchesSearch = 
                        c_item.title.toLowerCase().includes(searchLower) ||
                        c_item.id.toLowerCase().includes(searchLower) ||
                        (client_val?.full_name || "").toLowerCase().includes(searchLower) ||
                        (client_val?.email || "").toLowerCase().includes(searchLower) ||
                        (freelancer_val?.full_name || "").toLowerCase().includes(searchLower) ||
                        (freelancer_val?.email || "").toLowerCase().includes(searchLower);

                      const matchesFilter = contractFilter === "all" || c_item.status === contractFilter;
                      
                      return matchesSearch && matchesFilter;
                    })
                    .map(c_item => {
                      const client_val = users.find(u_item => u_item.id === c_item.client_id);
                      const freelancer_val = c_item.freelancer_id ? users.find(u_item => u_item.id === c_item.freelancer_id) : null;
                      
                      const formatDateSafe = (dateStr: any) => {
                        return formatDate(dateStr) || null;
                      };

                      const createdDate = formatDateSafe(c_item.created_at) || '—';
                      const updatedDate = formatDateSafe(c_item.updated_at) || createdDate;
                      
                      let completionDate = '—';
                      if (c_item.status === 'completed') {
                        completionDate = formatDateSafe(c_item.completed_at) || formatDateSafe(c_item.updated_at) || updatedDate;
                      }

                      return (
                        <TableRow key={c_item.id} className="text-xs">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{c_item.title}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{c_item.id.slice(0, 8)}...</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "capitalize text-[10px]",
                              c_item.status === 'active' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                              c_item.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                              c_item.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {t(`common.status.${c_item.status}`, { defaultValue: c_item.status.replace("_", " ") })}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold">${c_item.total_amount?.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{client_val?.full_name || t("common.unknown")}</span>
                              <span className="text-[10px] text-muted-foreground">{client_val?.email || c_item.client_id.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {freelancer_val ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{freelancer_val.full_name || t("common.anonymous")}</span>
                                <span className="text-[10px] text-muted-foreground">{freelancer_val.email || c_item.freelancer_id.slice(0, 8)}</span>
                              </div>
                            ) : (
                              <span className="text-amber-500 italic">{t("dashboard.awaitingAcceptance")}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{createdDate}</TableCell>
                          <TableCell className="text-muted-foreground">{updatedDate}</TableCell>
                          <TableCell className="text-muted-foreground font-medium">{completionDate}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="users" className="glass-card p-6">
            <div className="mb-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">{t("admin.users.title")}</h2>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("admin.users.searchPlaceholder")}
                    className="pl-9"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1.5 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">{t("admin.users.kycLabel")}</Label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("admin.users.allKYC")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.users.allKYC")}</SelectItem>
                      <SelectItem value="verified">{t("common.status.verified")}</SelectItem>
                      <SelectItem value="pending">{t("common.status.pending")}</SelectItem>
                      <SelectItem value="no_kyc">{t("admin.users.noKYC")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">{t("admin.users.statusLabel")}</Label>
                  <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t("admin.users.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.users.allStatus")}</SelectItem>
                      <SelectItem value="active">{t("common.status.active")}</SelectItem>
                      <SelectItem value="deactivated">{t("common.status.deactivated")}</SelectItem>
                      <SelectItem value="locked">{t("common.status.locked")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-border overflow-hidden horizontal-scroll-indicator">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead><TableHead>{t("common.role")}</TableHead>
                    <TableHead>{t("admin.users.kycCol")}</TableHead><TableHead>{t("admin.users.statusCol")}</TableHead>
                    <TableHead>{t("common.wallet")}</TableHead><TableHead>{t("admin.users.idCol")}</TableHead><TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter(u_item => {
                      const matchesSearch = (u_item.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) || u_item.id.toLowerCase().includes(userSearch.toLowerCase());

                      let matchesKyc = true;
                      if (userFilter === "verified") matchesKyc = u_item.kyc_verified === true;
                      else if (userFilter === "pending") matchesKyc = !u_item.kyc_verified && u_item.id_doc_front_url;
                      else if (userFilter === "no_kyc") matchesKyc = !u_item.kyc_verified && !u_item.id_doc_front_url;

                      let matchesStatus = true;
                      if (userStatusFilter !== "all") matchesStatus = u_item.account_status === userStatusFilter;

                      return matchesSearch && matchesKyc && matchesStatus;
                    })
                    .map(u_item => (
                      <TableRow key={u_item.id}>
                        <TableCell className="font-medium">{u_item.full_name || t("common.anonymous")}</TableCell>
                        <TableCell>{u_item.is_admin ? <Badge className="bg-primary">{t("common.admin")}</Badge> : <Badge variant="outline">{t("common.user")}</Badge>}</TableCell>
                        <TableCell>
                          {u_item.kyc_verified === true
                            ? <Badge className="bg-success/20 text-success border-success/30">{t("common.status.verified")}</Badge>
                            : u_item.id_doc_front_url
                              ? <Badge className="bg-warning/20 text-warning border-warning/30">{t("common.status.pending")}</Badge>
                              : <Badge variant="outline" className="text-muted-foreground">{t("admin.users.noKYC")}</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          {u_item.account_status === 'deactivated'
                            ? <Badge className="bg-destructive/20 text-destructive border-destructive/30 flex w-fit gap-1 items-center"><XCircle className="h-3 w-3" /> {t("common.status.deactivated")}</Badge>
                            : u_item.account_status === 'locked'
                              ? <Badge className="bg-warning/20 text-warning border-warning/30 flex w-fit gap-1 items-center"><Lock className="h-3 w-3" /> {t("common.status.locked")}</Badge>
                              : <Badge className="bg-success/20 text-success border-success/30 flex w-fit gap-1 items-center"><CheckCircle className="h-3 w-3" /> {t("common.status.active")}</Badge>
                          }
                        </TableCell>
                        <TableCell>${u_item.wallet_balance?.toLocaleString() || '0'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{u_item.id}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u_item.id_doc_front_url && (
                              <Button size="sm" variant="outline" onClick={() => openKycModal(u_item)} className="h-8">
                                {t("admin.users.reviewKYC")}
                              </Button>
                            )}

                            {!u_item.is_admin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{t("admin.users.actionsLabel")}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />

                                  {u_item.account_status === 'active' ? (
                                    <>
                                      <DropdownMenuItem onClick={() => handleUpdateUserStatus(u_item.id, 'deactivated')} className="text-red-500 focus:text-red-500">
                                        <ShieldAlert className="mr-2 h-4 w-4" /> {t("admin.users.deactivate")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateUserStatus(u_item.id, 'locked')} className="text-amber-500 focus:text-amber-500">
                                        <Lock className="mr-2 h-4 w-4" /> {t("admin.users.lock")}
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleUpdateUserStatus(u_item.id, 'active')} className="text-emerald-500 focus:text-emerald-500">
                                      <ShieldCheck className="mr-2 h-4 w-4" /> {t("admin.users.reactivate")}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="glass-card p-6">
            <div className="mb-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">{t("admin.ledger.title")}</h2>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("admin.ledger.searchPlaceholder")}
                    className="pl-9"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: t("common.all"), value: "all" },
                  { label: t("transactions.type.topup"), value: "wallet_topup" },
                  { label: t("transactions.type.escrow"), value: "escrow" },
                  { label: t("transactions.type.released"), value: "release" },
                  { label: t("common.fee"), value: "fee" },
                  { label: t("common.refund"), value: "refund" },
                  { label: t("common.withdrawal"), value: "withdrawal" }
                ].map((s_item) => (
                  <Button
                    key={s_item.value}
                    size="sm"
                    variant={txFilter === s_item.value ? "hero" : "outline"}
                    className="capitalize"
                    onClick={() => setTxFilter(s_item.value)}
                  >
                    {s_item.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border overflow-hidden horizontal-scroll-indicator">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[130px]">{t("common.type")}</TableHead>
                    <TableHead>{t("common.action")}</TableHead>
                    <TableHead>{t("common.contract")}</TableHead>
                    <TableHead className="w-[110px]">{t("common.status.label")}</TableHead>
                    <TableHead className="w-[110px]">{t("common.amount")}</TableHead>
                    <TableHead className="w-[130px]">{t("common.date")}</TableHead>
                    <TableHead className="w-[120px]">{t("admin.ledger.stripeRef")}</TableHead>
                    <TableHead className="w-[80px] text-right">{t("common.admin")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const filteredTransactions = transactions
                      .filter(tx_item => {
                        let effectiveType = tx_item.type;
                        if (tx_item.type === 'deposit') {
                          effectiveType = (tx_item.metadata?.contract_id || tx_item.contract_id) ? 'escrow' : 'wallet_topup';
                        } else if (tx_item.type === 'wallet_topup') {
                          effectiveType = 'wallet_topup';
                        }

                        const contract_val = contracts.find(c_item => c_item.id === (tx_item.metadata?.contract_id || tx_item.contract_id));
                        const fromUser = users.find(u_item => u_item.id === tx_item.from_user_id);
                        const toUser = users.find(u_item => u_item.id === tx_item.to_user_id);

                        const searchLower = txSearch.toLowerCase();
                        const matchesFilter = txFilter === "all" || effectiveType === txFilter;

                        const matchesSearch =
                          effectiveType.toLowerCase().includes(searchLower) ||
                          tx_item.amount.toString().includes(searchLower) ||
                          (contract_val?.title || "").toLowerCase().includes(searchLower) ||
                          (fromUser?.full_name || "").toLowerCase().includes(searchLower) ||
                          (toUser?.full_name || "").toLowerCase().includes(searchLower);

                        return matchesFilter && matchesSearch;
                      });

                    if (filteredTransactions.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            {t("admin.ledger.noMatch")}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return filteredTransactions.map(tx_item => {
                      let effectiveType = tx_item.type;
                      if (tx_item.type === 'deposit') {
                        effectiveType = (tx_item.metadata?.contract_id || tx_item.contract_id) ? 'escrow' : 'wallet_topup';
                      }

                      const contractId = tx_item.metadata?.contract_id || tx_item.contract_id;
                      const contract_val = contracts.find(c_item => c_item.id === contractId);
                      const fromUser = users.find(u_item => u_item.id === tx_item.from_user_id);
                      const toUser = users.find(u_item => u_item.id === tx_item.to_user_id);

                      const stripeRef = tx_item.metadata?.payment_intent_id || tx_item.metadata?.stripe_payment_id || tx_item.metadata?.stripe_id || "—";

                      const contractName = contract_val?.title || "";
                      const fromName = fromUser?.full_name || t("common.unknown");
                      const toName = toUser?.full_name || t("common.unknown");

                      let actionStr = t("common.transaction");
                      switch (effectiveType) {
                        case 'wallet_topup': actionStr = t("admin.ledger.action.topup", { name: toName || fromName }); break;
                        case 'escrow': actionStr = t("admin.ledger.action.escrow", { name: fromName }); break;
                        case 'release': actionStr = t("admin.ledger.action.release", { name: toName }); break;
                        case 'fee': actionStr = t("admin.ledger.action.fee", { name: fromName }); break;
                        case 'refund': actionStr = t("admin.ledger.action.refund", { name: toName }); break;
                        case 'withdrawal': actionStr = t("admin.ledger.action.withdrawal", { name: fromName }); break;
                      }

                      const formattedDate = new Intl.DateTimeFormat(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }).format(new Date(tx_item.created_at));

                      const badgeStyles: Record<string, string> = {
                        wallet_topup: "bg-purple-500/20 text-purple-500 border-purple-500/30",
                        escrow: "bg-blue-500/20 text-blue-500 border-blue-500/30",
                        release: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
                        fee: "bg-amber-500/20 text-amber-500 border-amber-500/30",
                        refund: "bg-red-500/20 text-red-500 border-red-500/30",
                        withdrawal: "bg-gray-500/20 text-gray-400 border-gray-500/30",
                      };

                      const status = tx_item.metadata?.status || "completed";

                      return (
                        <TableRow key={tx_item.id} className="hover:bg-muted/30 transition-colors text-xs">
                          <TableCell>
                            <Badge variant="outline" className={`capitalize whitespace-nowrap text-[10px] ${badgeStyles[effectiveType] || ""}`}>
                              {effectiveType === 'escrow' ? t("transactions.type.escrow") : t(`transactions.type.${effectiveType}`, { defaultValue: effectiveType.replace('_', ' ') })}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-foreground pr-4">
                            {actionStr}
                          </TableCell>
                          <TableCell>
                            {contract_val && contractId ? (
                              <div
                                className="cursor-pointer hover:text-primary transition-colors underline-offset-4 hover:underline leading-relaxed"
                                onClick={() => navigate(`/contracts/${contract_val.id}`)}
                              >
                                {contractName}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize whitespace-nowrap text-[10px] ${status === 'pending' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                              status === 'failed' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                                'bg-green-500/20 text-green-500 border-green-500/20'
                                }`}>
                              {t(`common.status.${status}`, { defaultValue: status })}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-bold ${(effectiveType === 'release' || effectiveType === 'wallet_topup') ? 'text-emerald-500' :
                            (effectiveType === 'fee') ? 'text-amber-500' :
                              (effectiveType === 'refund') ? 'text-red-500' : 'text-foreground'
                            }`}>
                            ${tx_item.amount?.toLocaleString()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formattedDate}</TableCell>
                          <TableCell>
                            {stripeRef !== "—" ? (
                              <div className="flex items-center gap-2 group">
                                <span className="text-[10px] font-mono text-muted-foreground">{stripeRef.substring(0, 16)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(stripeRef);
                                    toast.success(t("admin.success.copied"));
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {effectiveType === 'withdrawal' && status === 'pending' ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6 border-green-500/50 text-green-500 hover:bg-green-500/10"
                                  onClick={() => handleApproveWithdrawal(tx_item)}
                                  title={t("admin.ledger.approveBtn")}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6 border-red-500/50 text-red-500 hover:bg-red-500/10"
                                  onClick={() => handleRejectWithdrawal(tx_item)}
                                  title={t("admin.ledger.rejectBtn")}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="support" className="glass-card p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
              <div className="lg:col-span-4 border-r border-border/50 pr-4 flex flex-col">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-1">{t("admin.support.title")}</h2>
                  <p className="text-xs text-muted-foreground mb-3">{t("admin.support.subtitle")}</p>

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("admin.support.searchPlaceholder")}
                      className="pl-9 h-8 text-xs bg-muted/20"
                      value={ticketSearch}
                      onChange={(e) => setTicketSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {["all", "open", "in progress", "pending user", "resolved", "closed"].map((s_item) => (
                      <button
                        key={s_item}
                        onClick={() => setTicketFilter(s_item)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all capitalize",
                          ticketFilter === s_item
                            ? "bg-primary/20 text-primary border-primary/50"
                            : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50"
                        )}
                      >
                        {t(`common.status.${s_item}`, { defaultValue: s_item })}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-2">
                  {tickets.filter(t_item => {
                    const matchesStatus = ticketFilter === 'all' || t_item.status === ticketFilter;
                    const searchLower = ticketSearch.toLowerCase();
                    const matchesSearch =
                      t_item.subject.toLowerCase().includes(searchLower) ||
                      (t_item.profiles?.full_name || "").toLowerCase().includes(searchLower) ||
                      (t_item.profiles?.email || "").toLowerCase().includes(searchLower);
                    return matchesStatus && matchesSearch;
                  }).length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground italic text-sm">
                      {t("admin.support.none")}
                    </div>
                  ) : (
                    tickets
                      .filter(t_item => {
                        const matchesStatus = ticketFilter === 'all' || t_item.status === ticketFilter;
                        const searchLower = ticketSearch.toLowerCase();
                        const matchesSearch =
                          t_item.subject.toLowerCase().includes(searchLower) ||
                          (t_item.profiles?.full_name || "").toLowerCase().includes(searchLower) ||
                          (t_item.profiles?.email || "").toLowerCase().includes(searchLower);
                        return matchesStatus && matchesSearch;
                      })
                      .map((t_item) => (
                        <div
                          key={t_item.id}
                          onClick={() => setSelectedAdminTicket(t_item)}
                          className={cn(
                            "p-3 rounded-lg border border-border/50 cursor-pointer transition-all hover:bg-muted/50",
                            selectedAdminTicket?.id === t_item.id ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : ""
                          )}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold truncate pr-2">{t_item.subject}</span>
                            <Badge variant="outline" className={cn(
                              "text-[10px] px-1.5 py-0 capitalize",
                              t_item.status === 'open' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                t_item.status === 'in progress' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 font-bold" :
                                  t_item.status === 'pending user' ? "bg-amber-500/20 text-amber-500 border-amber-500/30" :
                                    t_item.status === 'resolved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                      "bg-muted text-muted-foreground border-border/50"
                            )}>
                              {t(`common.status.${t_item.status}`, { defaultValue: t_item.status.replace("pending user", "Pending User") })}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium truncate mb-1">
                            {t("common.from")}: {t_item.profiles?.full_name || t_item.user_id.slice(0, 8)} ({t_item.profiles?.email})
                          </div>
                          <div className="text-[10px] text-muted-foreground/60 text-right">
                            {new Date(t_item.updated_at).toLocaleString()}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-8 flex flex-col h-full bg-muted/10 rounded-xl overflow-hidden relative">
                {!selectedAdminTicket ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30">
                    <MessageSquareText className="h-16 w-16 mb-4" />
                    <p>{t("admin.support.selectMsg")}</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-background/50 border-b border-border flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{selectedAdminTicket.subject}</h3>
                        <p className="text-[10px] text-muted-foreground">
                          {t("common.from")}: {selectedAdminTicket.profiles?.full_name || t("common.user")} ({selectedAdminTicket.profiles?.email || selectedAdminTicket.user_id.slice(0, 8)})
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Select
                          value={selectedAdminTicket.status}
                          onValueChange={async (val) => {
                            await supabase.from("support_tickets").update({ status: val }).eq("id", selectedAdminTicket.id);
                            setTickets(prev => prev.map(t_item => t_item.id === selectedAdminTicket.id ? { ...t_item, status: val } : t_item));
                            setSelectedAdminTicket({ ...selectedAdminTicket, status: val });
                            toast.success(t("admin.success.statusUpdated", { status: val }));
                          }}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">{t("admin.support.status.open")}</SelectItem>
                            <SelectItem value="in progress">{t("admin.support.status.inProgress")}</SelectItem>
                            <SelectItem value="pending user">{t("admin.support.status.pendingUser")}</SelectItem>
                            <SelectItem value="resolved">{t("admin.support.status.resolved")}</SelectItem>
                            <SelectItem value="closed">{t("admin.support.status.closed")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => setSelectedAdminTicket(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                          title={t("admin.support.backToList")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      {adminMessages.map((msg_item) => (
                        <div
                          key={msg_item.id}
                          className={cn(
                            "flex flex-col max-w-[85%]",
                            msg_item.is_admin_reply ? "ml-auto items-end" : "mr-auto items-start"
                          )}
                        >
                          <div className={cn(
                            "p-3 rounded-xl text-xs leading-relaxed",
                            msg_item.is_admin_reply
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-background border border-border rounded-tl-none"
                          )}>
                            {msg_item.message}
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1">
                            {new Date(msg_item.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendAdminReply} className="p-4 bg-background/50 border-t border-border">
                      <div className="flex gap-2">
                        <Input
                          placeholder={t("admin.support.replyPlaceholder")}
                          className="text-xs h-10"
                          value={newAdminReply}
                          onChange={(e) => setNewAdminReply(e.target.value)}
                        />
                        <Button type="submit" size="icon" className="h-10 w-10 shrink-0">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {kycUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <h2 className="text-lg font-bold text-foreground">{t("admin.kyc.reviewTitle")} — {kycUser.full_name || t("common.user")}</h2>
              <button onClick={() => setKycUser(null)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground mb-3">{t("admin.kyc.personalDetails")}</h3>
                {[
                  [t("common.fullName"), kycUser.full_name],
                  [t("common.email"), kycUser.id],
                  [t("common.phone"), kycUser.phone],
                  [t("common.dob"), kycUser.date_of_birth],
                  [t("common.country"), kycUser.country],
                  [t("common.accountType"), kycUser.account_type],
                  [t("common.idType"), kycUser.id_type?.replace("_", " ")],
                  [t("common.idNumber"), kycUser.id_number],
                ].map(([label_val, value_val]) => value_val ? (
                  <div key={label_val} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label_val}</span>
                    <span className="text-foreground font-medium capitalize">{value_val}</span>
                  </div>
                ) : null)}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">{t("admin.kyc.identityDocs")}</h3>
                <DocPreview url={kycUrls.front} label={t("admin.kyc.idFront")} />
                {kycUser.id_doc_back_url && <DocPreview url={kycUrls.back} label={t("admin.kyc.idBack")} />}
                <DocPreview url={kycUrls.selfie} label={t("admin.kyc.selfie")} />
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                {!showRejectInput ? (
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                      disabled={kycAction}
                      onClick={handleApprove}
                    >
                      <CheckCircle className="h-4 w-4" /> {t("admin.kyc.approveBtn")}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 gap-2"
                      disabled={kycAction}
                      onClick={() => setShowRejectInput(true)}
                    >
                      <XCircle className="h-4 w-4" /> {t("admin.kyc.rejectBtn")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label>{t("admin.kyc.rejectionReasonLabel")} <span className="text-destructive">*</span></Label>
                      <Input
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder={t("admin.kyc.rejectionReasonPlaceholder")}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                        disabled={kycAction}
                        onClick={handleReject}
                      >
                        {kycAction ? t("common.processing") : t("admin.kyc.confirmRejectBtn")}
                      </Button>
                      <Button variant="ghost" onClick={() => setShowRejectInput(false)}>{t("common.cancel")}</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
