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
import { cn } from "@/lib/utils";
import {
  Users, LayoutDashboard, Settings, FileText, Activity, AlertTriangle,
  Search, ShieldAlert, LogOut, CheckCircle2, CheckCircle, XCircle, MoreVertical,
  Trash2, ShieldCheck, Copy, ArrowRightLeft, Check, X, ImageIcon, Lock, Unlock,
  DollarSign, TrendingUp, LifeBuoy, Send, MessageSquare, MessageSquareText
} from "lucide-react";
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
import { SUPABASE_ANON_KEY } from "@/integrations/supabase/client";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/auth");
      else checkAdmin();
    }
  }, [user, authLoading]);

  const checkAdmin = async () => {
    try {
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user?.id).maybeSingle();

      const isUserAdmin = profile?.is_admin || user?.user_metadata?.role === 'admin' || user?.email === 'admin@pactpay.com';

      if (!isUserAdmin) {
        toast.error("Unauthorized: Admin access only");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      fetchAllData();
    } catch (err: any) {
      console.error("Admin check failed:", err);
      toast.error("Failed to verify admin status: " + err.message);
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
      // Don't auto-select — let admin choose

    } catch (err: any) {
      console.error("Failed to fetch admin data:", err);
      toast.error("Data fetch failed: " + err.message);
    } finally {
      setLoading(false);
    }
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

  // Global Realtime listener for tickets
  useEffect(() => {
    if (isAdmin) {
      const ticketChannel = supabase
        .channel('global-admin-tickets')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        }, (payload) => {
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

    // Update ticket status
    await supabase.from("support_tickets").update({
      status: 'pending user',
      updated_at: new Date().toISOString()
    }).eq("id", selectedAdminTicket.id);

    // Also send a system notification to the user
    await supabase.from("notifications").insert({
      user_id: selectedAdminTicket.user_id,
      title: "Support Update",
      message: "You have a new reply from Pactpay Support",
      type: "system",
      link: "/support"
    });
  };

  const handleSendDisputeReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisputeReply.trim() || !selectedAdminDispute) return;

    const msg = newDisputeReply;
    setNewDisputeReply("");

    await supabase.from("dispute_messages").insert({
      dispute_id: selectedAdminDispute.id,
      user_id: user?.id,
      message: msg,
      is_admin_reply: true
    });
  };

  const handleResolveDispute = async (disputeId: string, resolution: "release" | "refund") => {
    setResolving(true);
    try {
      const { data: dispute } = await supabase.from("disputes").select("*").eq("id", disputeId).single();
      if (!dispute || dispute.status === "resolved") throw new Error("Dispute invalid or already resolved");

      const { data: ms } = await supabase.from("milestones").select("*").eq("id", dispute.milestone_id).single();
      const { data: contract } = await supabase.from("contracts").select("*").eq("id", dispute.contract_id).single();

      if (resolution === "release") {
        const { data: p } = await supabase.from("profiles").select("wallet_balance").eq("id", contract.freelancer_id).single();
        await supabase.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + ms.amount }).eq("id", contract.freelancer_id);
        await supabase.from("transactions").insert({
          type: "release", amount: ms.amount, to_user_id: contract.freelancer_id, metadata: { note: "Dispute resolved in favor of freelancer" }
        });
        await supabase.from("milestones").update({ status: "completed" }).eq("id", ms.id);
        await supabase.from("notifications").insert({
          user_id: contract.freelancer_id, type: "system", message: `Dispute resolved! Funds for "${ms.name}" released to your wallet.`
        });
      } else if (resolution === "refund") {
        const { data: p } = await supabase.from("profiles").select("wallet_balance").eq("id", contract.client_id).single();
        await supabase.from("profiles").update({ wallet_balance: (p?.wallet_balance || 0) + ms.amount }).eq("id", contract.client_id);
        await supabase.from("transactions").insert({
          type: "refund", amount: ms.amount, to_user_id: contract.client_id, metadata: { note: "Dispute refunded" }
        });
        await supabase.from("milestones").update({ status: "cancelled" }).eq("id", ms.id);
        await supabase.from("notifications").insert({
          user_id: contract.client_id, type: "system", message: `Dispute resolved! Funds for "${ms.name}" refunded to your wallet.`
        });
      }

      await supabase.from("disputes").update({ status: "resolved", resolution_notes: resolution }).eq("id", dispute.id);

      const { data: allMs } = await supabase.from("milestones").select("status").eq("contract_id", contract.id);
      const allCompletedOrCancelled = allMs?.every((m: any) => m.status === "completed" || m.status === "cancelled");
      if (allCompletedOrCancelled) {
        await supabase.from("contracts").update({ status: "completed" }).eq("id", contract.id);
      } else {
        await supabase.from("contracts").update({ status: "active" }).eq("id", contract.id);
      }

      toast.success(`Dispute resolved! Funds ${resolution === "release" ? "released to freelancer" : "refunded to client"}.`);
      fetchAllData();
    } catch (err: any) {
      toast.error(`Failed to resolve dispute: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  // Open KYC review modal and generate signed URLs
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
    if (error) toast.error("Failed to approve: " + error.message);
    else { toast.success(`✅ KYC approved for ${kycUser.full_name || kycUser.id}`); fetchAllData(); setKycUser(null); }
    setKycAction(false);
  };

  const handleApproveWithdrawal = async (t: any) => {
    try {
      const updatedMetadata = { ...t.metadata, status: 'completed' };
      const { error } = await supabase.from('transactions').update({ metadata: updatedMetadata }).eq('id', t.id);
      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: t.from_user_id,
        type: 'withdrawal_approved',
        message: `Withdrawal Approved: Your withdrawal for $${t.amount.toLocaleString()} has been processed.`
      });

      toast.success("Withdrawal approved and marked as completed");
      fetchAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve withdrawal");
    }
  };

  const handleRejectWithdrawal = async (t: any) => {
    try {
      const updatedMetadata = { ...t.metadata, status: 'failed', rejection_reason: 'Admin rejected' };

      // Refund logic - restore user's wallet balance
      const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', t.from_user_id).single();
      if (profile) {
        await supabase.from('profiles').update({ wallet_balance: (profile.wallet_balance || 0) + t.amount }).eq('id', t.from_user_id);
      }

      const { error } = await supabase.from('transactions').update({ metadata: updatedMetadata }).eq('id', t.id);
      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: t.from_user_id,
        type: 'withdrawal_rejected',
        message: `Withdrawal Rejected: Your withdrawal of $${t.amount.toLocaleString()} was not approved. Funds returned to wallet.`
      });

      toast.success("Withdrawal rejected and funds refunded to user");
      fetchAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject withdrawal");
    }
  };

  const handleReject = async () => {
    if (!kycUser) return;
    if (!rejectReason.trim()) { toast.error("Please enter a rejection reason."); return; }
    setKycAction(true);
    const { error } = await supabase.from("profiles").update({ kyc_verified: false }).eq("id", kycUser.id);
    if (error) toast.error("Failed to reject: " + error.message);
    else { toast.success(`❌ KYC rejected for ${kycUser.full_name || kycUser.id}`); fetchAllData(); setKycUser(null); }
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

      toast.success(`User account ${newStatus} successfully!`);
      fetchAllData();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
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
            <FileText className="h-4 w-4" /> View PDF
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
          <ImageIcon className="h-4 w-4" /> Not uploaded
        </div>
      )}
    </div>
  );

  if (loading || authLoading || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Loading Admin...</div>;
  }

  const totalRevenue = transactions.filter(t => t.type === "fee").reduce((sum, t) => sum + t.amount, 0);
  const totalPayouts = transactions.filter(t => t.type === "revenue_payout").reduce((sum, t) => sum + t.amount, 0);
  const netEarnings = totalRevenue - totalPayouts;

  // Calculate Active Escrow: Total Escrow In - (Released + Refunded)
  const totalEscrowIn = transactions.filter(t => t.type === "escrow").reduce((sum, t) => sum + t.amount, 0);
  const totalEscrowOut = transactions.filter(t => t.type === "release" || t.type === "refund").reduce((sum, t) => sum + t.amount, 0);
  const activeEscrow = totalEscrowIn - totalEscrowOut;

  // Calculate Total System Liquidity (All Wallet Balances)
  const totalLiquidity = users.reduce((sum, u) => sum + (u.wallet_balance || 0), 0);

  const handleFeePayout = async () => {
    const amountStr = prompt(`Enter amount to withdraw from platform fees (Available: $${netEarnings.toLocaleString()}):`);
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    if (amount > netEarnings) {
      toast.error("Amount exceeds available earnings");
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

      toast.success(`Successfully withdrew $${amount.toLocaleString()} from platform fees`);
      fetchAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process payout");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Control Panel</h1>
              <p className="text-muted-foreground mt-1">Platform overview and high-level system management</p>
            </div>
            <Button
              variant="hero"
              onClick={handleFeePayout}
              className="gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
              disabled={netEarnings <= 0}
            >
              <TrendingUp className="h-4 w-4" /> Withdraw Platform Fees
            </Button>
          </div>

          {/* NEW Stats Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 border-primary/20 bg-primary/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-3 w-3" /> Total Platform Liquidity
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">${totalLiquidity.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">USD</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Combined user wallet balances</p>
            </div>

            <div className="glass-card p-5 border-warning/20 bg-warning/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-3 w-3" /> Active Escrow Locked
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-warning">${activeEscrow.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">USD</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Total funds in active contracts</p>
            </div>

            <div className="glass-card p-5 border-success/20 bg-success/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3 w-3" /> Net Platform Earnings
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-success">${netEarnings.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">Available</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Total fees collected (payouts deducted)</p>
            </div>

            <div className="glass-card p-5 border-status-active/20 bg-status-active/5 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <Users className="h-3 w-3" /> Total Active Users
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-status-active">{users.length.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">Active</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Verified and pending users</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card glass-card">
            <TabsTrigger value="disputes">Active Disputes ({disputes.filter(d => d.status === 'open').length})</TabsTrigger>
            <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
            <TabsTrigger value="support">Support ({tickets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="disputes" className="glass-card p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
              {/* Disputes List */}
              <div className="lg:col-span-4 border-r border-border/50 pr-4 flex flex-col">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-1">Dispute Resolution</h2>
                  <p className="text-xs text-muted-foreground mb-3">Manage and resolve contract conflicts</p>

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by contract or reason..."
                      className="pl-9 h-8 text-xs bg-muted/20"
                      value={disputeSearch}
                      onChange={(e) => setDisputeSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {["all", "open", "resolved"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setDisputeFilter(s)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all capitalize",
                          disputeFilter === s
                            ? "bg-primary/20 text-primary border-primary/50"
                            : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-2">
                  {disputes.filter(d => {
                    const contractTitle = contracts.find(c => c.id === d.contract_id)?.title || "";
                    const matchesStatus = disputeFilter === 'all' || d.status === disputeFilter;
                    const searchLower = disputeSearch.toLowerCase();
                    const matchesSearch =
                      contractTitle.toLowerCase().includes(searchLower) ||
                      (d.reason || "").toLowerCase().includes(searchLower);
                    return matchesStatus && matchesSearch;
                  }).length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground italic text-sm">
                      No disputes found
                    </div>
                  ) : (
                    disputes
                      .filter(d => {
                        const contractTitle = contracts.find(c => c.id === d.contract_id)?.title || "";
                        const matchesStatus = disputeFilter === 'all' || d.status === disputeFilter;
                        const searchLower = disputeSearch.toLowerCase();
                        const matchesSearch =
                          contractTitle.toLowerCase().includes(searchLower) ||
                          (d.reason || "").toLowerCase().includes(searchLower);
                        return matchesStatus && matchesSearch;
                      })
                      .map((d) => {
                        const relatedContract = contracts.find(c => c.id === d.contract_id);
                        return (
                          <div
                            key={d.id}
                            onClick={() => setSelectedAdminDispute(d)}
                            className={cn(
                              "p-3 rounded-lg border border-border/50 cursor-pointer transition-all hover:bg-muted/50",
                              selectedAdminDispute?.id === d.id ? "bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20" : ""
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-bold truncate pr-2">{relatedContract?.title || "Contract"}</span>
                              <Badge variant={d.status === 'open' ? "destructive" : "outline"} className="text-[10px] px-1.5 py-0 capitalize">
                                {d.status}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate mb-1 italic">"{d.reason}"</p>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground/60">
                               <span>ID: {d.id.slice(0, 8)}</span>
                               <span>{new Date(d.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Dispute Resolution Center Chat View */}
              <div className="lg:col-span-8 flex flex-col h-full bg-muted/10 rounded-xl overflow-hidden relative">
                {!selectedAdminDispute ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30">
                    <ShieldAlert className="h-16 w-16 mb-4" />
                    <p>Select a dispute to open the Resolution Center</p>
                  </div>
                ) : (() => {
                  const contract = contracts.find(c => c.id === selectedAdminDispute.contract_id);
                  const milestone = milestones.find(m => m.id === selectedAdminDispute.milestone_id);
                  const client = users.find(u => u.id === contract?.client_id);
                  const freelancer = users.find(u => u.id === contract?.freelancer_id);

                  return (
                    <>
                      <div className="p-6 bg-background/50 border-b border-border flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-6">
                          <h3 className="text-lg font-bold truncate mb-2">{contract?.title} - Dispute</h3>
                          <div className="flex flex-wrap items-center gap-3">
                             <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] max-w-[300px] truncate block py-1">
                               Milestone: {milestone?.title || milestone?.name || "N/A"}
                             </Badge>
                             <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                <DollarSign className="h-3 w-3 text-amber-500" />
                                <span className="text-[10px] font-bold text-amber-500">{milestone?.amount?.toLocaleString()} Locked</span>
                             </div>
                          </div>
                        </div>
                        <div className="flex gap-4 items-center shrink-0">
                          {selectedAdminDispute.status === "open" && (
                            <div className="flex gap-3">
                               <Button size="sm" variant="hero" className="h-9 px-4 shadow-lg shadow-primary/20" onClick={() => handleResolveDispute(selectedAdminDispute.id, "release")}>
                                 Release to Freelancer
                               </Button>
                               <Button size="sm" variant="outline" className="h-9 px-4 border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => handleResolveDispute(selectedAdminDispute.id, "refund")}>
                                 Refund Client
                               </Button>
                            </div>
                          )}
                          <button
                            onClick={() => setSelectedAdminDispute(null)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-border"
                            title="Close"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-500/5 border-b border-amber-500/10">
                         <p className="text-[10px] text-muted-foreground font-medium uppercase mb-1">Dispute Reason:</p>
                         <p className="text-xs italic text-foreground bg-background/50 p-2 rounded border border-amber-500/10">
                           {selectedAdminDispute.reason}
                         </p>
                         <div className="flex gap-4 mt-2">
                            <div className="text-[10px]"><span className="text-muted-foreground">Client:</span> <span className="font-medium">{client?.full_name}</span></div>
                            <div className="text-[10px]"><span className="text-muted-foreground">Freelancer:</span> <span className="font-medium">{freelancer?.full_name}</span></div>
                         </div>
                      </div>

                      {/* Conversation Area */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {disputeMessages.length === 0 ? (
                          <div className="py-12 text-center">
                            <p className="text-xs text-muted-foreground italic">No messages in this dispute center yet.</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Start the conversation by dropping a message below.</p>
                          </div>
                        ) : (
                          disputeMessages.map((msg) => {
                            const isMe = msg.user_id === user?.id;
                            const isClientMsg = msg.user_id === contract?.client_id;
                            const isFreelancerMsg = msg.user_id === contract?.freelancer_id;
                            
                            return (
                              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                <div className="flex items-center gap-1.5 mb-1 px-1">
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    {isMe ? "You (Admin)" : 
                                     isClientMsg ? `${client?.full_name} (Client)` : 
                                     isFreelancerMsg ? `${freelancer?.full_name} (Freelancer)` :
                                     (msg.profiles?.full_name || 'User')}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground/50">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className={cn(
                                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                  isMe ? "bg-primary text-white rounded-tr-none" : 
                                  isClientMsg ? "bg-blue-500/10 text-foreground border border-blue-500/20 rounded-tl-none" :
                                  isFreelancerMsg ? "bg-green-500/10 text-foreground border border-green-500/20 rounded-tl-none" :
                                  "bg-card text-foreground rounded-tl-none border border-border"
                                )}>
                                  {msg.message}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Reply Box */}
                      {selectedAdminDispute.status === "open" && (
                        <div className="p-4 bg-background/50 border-t border-border">
                          <form onSubmit={handleSendDisputeReply} className="flex gap-2">
                            <Input
                              placeholder="Type your message to resolve this dispute..."
                              className="flex-1"
                              value={newDisputeReply}
                              onChange={(e) => setNewDisputeReply(e.target.value)}
                            />
                            <Button type="submit" size="icon" disabled={!newDisputeReply.trim()}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </form>
                          <p className="text-[10px] text-muted-foreground mt-2 text-center">
                            Messages sent here are visible to both the Client and the Freelancer.
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
                <h2 className="text-xl font-semibold">All Contracts</h2>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contracts..."
                    className="pl-9"
                    value={contractSearch}
                    onChange={(e) => setContractSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "pending", "active", "completed", "cancelled"].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={contractFilter === s ? "hero" : "outline"}
                    className="capitalize"
                    onClick={() => setContractFilter(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Freelancer</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead>Completion Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts
                    .filter(c => {
                      const client = users.find(u => u.id === c.client_id);
                      const freelancer = c.freelancer_id ? users.find(u => u.id === c.freelancer_id) : null;
                      const searchLower = contractSearch.toLowerCase();
                      
                      const matchesSearch = 
                        c.title.toLowerCase().includes(searchLower) ||
                        c.id.toLowerCase().includes(searchLower) ||
                        (client?.full_name || "").toLowerCase().includes(searchLower) ||
                        (client?.email || "").toLowerCase().includes(searchLower) ||
                        (freelancer?.full_name || "").toLowerCase().includes(searchLower) ||
                        (freelancer?.email || "").toLowerCase().includes(searchLower);

                      const matchesFilter = contractFilter === "all" || c.status === contractFilter;
                      
                      return matchesSearch && matchesFilter;
                    })
                    .map(c => {
                      const client = users.find(u => u.id === c.client_id);
                      const freelancer = c.freelancer_id ? users.find(u => u.id === c.freelancer_id) : null;
                      
                      // Defensive date formatting
                      const formatDateSafe = (dateStr: any) => {
                        if (!dateStr) return null;
                        const d = new Date(dateStr);
                        return isNaN(d.getTime()) ? null : d.toLocaleDateString();
                      };

                      const createdDate = formatDateSafe(c.created_at) || '—';
                      const updatedDate = formatDateSafe(c.updated_at) || createdDate;
                      
                      // Completion date: use completed_at if exists, or updated_at if status is completed
                      let completionDate = '—';
                      if (c.status === 'completed') {
                        completionDate = formatDateSafe(c.completed_at) || formatDateSafe(c.updated_at) || updatedDate;
                      }

                      return (
                        <TableRow key={c.id} className="text-xs">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{c.title}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{c.id.slice(0, 8)}...</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "capitalize text-[10px]",
                              c.status === 'active' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                              c.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                              c.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {c.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold">${c.total_amount?.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{client?.full_name || 'Unknown'}</span>
                              <span className="text-[10px] text-muted-foreground">{client?.email || c.client_id.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {freelancer ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{freelancer.full_name || 'Anonymous'}</span>
                                <span className="text-[10px] text-muted-foreground">{freelancer.email || c.freelancer_id.slice(0, 8)}</span>
                              </div>
                            ) : (
                              <span className="text-amber-500 italic">Awaiting acceptance</span>
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
                <h2 className="text-xl font-semibold">Registered Users</h2>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1.5 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">KYC Status</Label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All KYC States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All KYC States</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="no_kyc">No Documents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">Account Status</Label>
                  <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Account Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Role</TableHead>
                    <TableHead>KYC Status</TableHead><TableHead>Account Status</TableHead>
                    <TableHead>Wallet</TableHead><TableHead>User ID</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter(u => {
                      const matchesSearch = (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) || u.id.toLowerCase().includes(userSearch.toLowerCase());

                      // Filter by KYC Status
                      let matchesKyc = true;
                      if (userFilter === "verified") matchesKyc = u.kyc_verified === true;
                      else if (userFilter === "pending") matchesKyc = !u.kyc_verified && u.id_doc_front_url;
                      else if (userFilter === "no_kyc") matchesKyc = !u.kyc_verified && !u.id_doc_front_url;

                      // Filter by Account Status
                      let matchesStatus = true;
                      if (userStatusFilter !== "all") matchesStatus = u.account_status === userStatusFilter;

                      return matchesSearch && matchesKyc && matchesStatus;
                    })
                    .map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name || 'Anonymous'}</TableCell>
                        <TableCell>{u.is_admin ? <Badge className="bg-primary">Admin</Badge> : <Badge variant="outline">User</Badge>}</TableCell>
                        <TableCell>
                          {u.kyc_verified === true
                            ? <Badge className="bg-success/20 text-success border-success/30">Verified</Badge>
                            : u.id_doc_front_url
                              ? <Badge className="bg-warning/20 text-warning border-warning/30">Pending</Badge>
                              : <Badge variant="outline" className="text-muted-foreground">No KYC</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          {u.account_status === 'deactivated'
                            ? <Badge className="bg-destructive/20 text-destructive border-destructive/30 flex w-fit gap-1 items-center"><XCircle className="h-3 w-3" /> Deactivated</Badge>
                            : u.account_status === 'locked'
                              ? <Badge className="bg-warning/20 text-warning border-warning/30 flex w-fit gap-1 items-center"><Lock className="h-3 w-3" /> Locked</Badge>
                              : <Badge className="bg-success/20 text-success border-success/30 flex w-fit gap-1 items-center"><CheckCircle className="h-3 w-3" /> Active</Badge>
                          }
                        </TableCell>
                        <TableCell>${u.wallet_balance?.toLocaleString() || '0'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{u.id}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.id_doc_front_url && (
                              <Button size="sm" variant="outline" onClick={() => openKycModal(u)} className="h-8">
                                Review KYC
                              </Button>
                            )}

                            {!u.is_admin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />

                                  {u.account_status === 'active' ? (
                                    <>
                                      <DropdownMenuItem onClick={() => handleUpdateUserStatus(u.id, 'deactivated')} className="text-red-500 focus:text-red-500">
                                        <ShieldAlert className="mr-2 h-4 w-4" /> Deactivate Account
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateUserStatus(u.id, 'locked')} className="text-amber-500 focus:text-amber-500">
                                        <Lock className="mr-2 h-4 w-4" /> Lock Account
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleUpdateUserStatus(u.id, 'active')} className="text-emerald-500 focus:text-emerald-500">
                                      <ShieldCheck className="mr-2 h-4 w-4" /> Reactivate Account
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
                <h2 className="text-xl font-semibold">Master Ledger</h2>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by amount, type, user or reference..."
                    className="pl-9"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "All", value: "all" },
                  { label: "Wallet Topup", value: "wallet_topup" },
                  { label: "Escrow Deposit", value: "escrow" },
                  { label: "Milestone Release", value: "release" },
                  { label: "Fee", value: "fee" },
                  { label: "Refund", value: "refund" },
                  { label: "Withdrawal", value: "withdrawal" }
                ].map((s) => (
                  <Button
                    key={s.value}
                    size="sm"
                    variant={txFilter === s.value ? "hero" : "outline"}
                    className="capitalize"
                    onClick={() => setTxFilter(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[130px]">Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[110px]">Amount</TableHead>
                    <TableHead className="w-[130px]">Date</TableHead>
                    <TableHead className="w-[120px]">Stripe Ref</TableHead>
                    <TableHead className="w-[80px] text-right">Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const filteredTransactions = transactions
                      .filter(t => {
                        // Derived type logic for filtering
                        let effectiveType = t.type;
                        if (t.type === 'deposit') {
                          effectiveType = (t.metadata?.contract_id || t.contract_id) ? 'escrow' : 'wallet_topup';
                        } else if (t.type === 'wallet_topup') {
                          effectiveType = 'wallet_topup';
                        }

                        // Resolver Lookups
                        const contract = contracts.find(c => c.id === (t.metadata?.contract_id || t.contract_id));
                        const fromUser = users.find(u => u.id === t.from_user_id);
                        const toUser = users.find(u => u.id === t.to_user_id);

                        const searchLower = txSearch.toLowerCase();
                        const matchesFilter = txFilter === "all" || effectiveType === txFilter;

                        // Broad Search logic
                        const matchesSearch =
                          effectiveType.toLowerCase().includes(searchLower) ||
                          t.amount.toString().includes(searchLower) ||
                          (contract?.title || "").toLowerCase().includes(searchLower) ||
                          (fromUser?.full_name || "").toLowerCase().includes(searchLower) ||
                          (toUser?.full_name || "").toLowerCase().includes(searchLower);

                        return matchesFilter && matchesSearch;
                      });

                    if (filteredTransactions.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            No transactions match your search
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return filteredTransactions.map(t => {
                      // Derived logic for badges
                      let effectiveType = t.type;
                      if (t.type === 'deposit') {
                        effectiveType = (t.metadata?.contract_id || t.contract_id) ? 'escrow' : 'wallet_topup';
                      }

                      // Resolve Contract and Users
                      const contractId = t.metadata?.contract_id || t.contract_id;
                      const contract = contracts.find(c => c.id === contractId);
                      const fromUser = users.find(u => u.id === t.from_user_id);
                      const toUser = users.find(u => u.id === t.to_user_id);

                      const stripeRef = t.metadata?.payment_intent_id || t.metadata?.stripe_payment_id || t.metadata?.stripe_id || "—";

                      const contractName = contract?.title || "";
                      const fromName = fromUser?.full_name || "Unknown";
                      const toName = toUser?.full_name || "Unknown";

                      // Build simplified Action string
                      let actionStr = "Transaction";
                      switch (effectiveType) {
                        case 'wallet_topup': actionStr = `Wallet top up by ${toName || fromName}`; break;
                        case 'escrow': actionStr = `Escrow deposit by ${fromName}`; break;
                        case 'release': actionStr = `Milestone payment to ${toName}`; break;
                        case 'fee': actionStr = `Platform fee from ${fromName}`; break;
                        case 'refund': actionStr = `Refund to ${toName}`; break;
                        case 'withdrawal': actionStr = `Withdrawal by ${fromName}`; break;
                      }

                      // Format Date
                      const formattedDate = new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }).format(new Date(t.created_at));

                      // Badge Colors
                      const badgeStyles: Record<string, string> = {
                        wallet_topup: "bg-purple-500/20 text-purple-500 border-purple-500/30",
                        escrow: "bg-blue-500/20 text-blue-500 border-blue-500/30",
                        release: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
                        fee: "bg-amber-500/20 text-amber-500 border-amber-500/30",
                        refund: "bg-red-500/20 text-red-500 border-red-500/30",
                        withdrawal: "bg-gray-500/20 text-gray-400 border-gray-500/30",
                      };

                      // Transaction logic
                      const status = t.metadata?.status || "completed";

                      return (
                        <TableRow key={t.id} className="hover:bg-muted/30 transition-colors text-xs">
                          <TableCell>
                            <Badge variant="outline" className={`capitalize whitespace-nowrap text-[10px] ${badgeStyles[effectiveType] || ""}`}>
                              {effectiveType === 'escrow' ? 'Escrow Deposit' : effectiveType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-foreground pr-4">
                            {actionStr}
                          </TableCell>
                          <TableCell>
                            {contract && contractId ? (
                              <div
                                className="cursor-pointer hover:text-primary transition-colors underline-offset-4 hover:underline leading-relaxed"
                                onClick={() => navigate(`/contracts/${contract.id}`)}
                              >
                                {contractName}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize whitespace-nowrap text-[10px] ${status === 'pending' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                              status === 'failed' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                                'bg-green-500/20 text-green-500 border-green-500/30'
                              }`}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-bold ${(effectiveType === 'release' || effectiveType === 'wallet_topup') ? 'text-emerald-500' :
                            (effectiveType === 'fee') ? 'text-amber-500' :
                              (effectiveType === 'refund') ? 'text-red-500' : 'text-foreground'
                            }`}>
                            ${t.amount?.toLocaleString()}
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
                                    toast.success("Reference copied");
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
                                  onClick={() => handleApproveWithdrawal(t)}
                                  title="Approve & Mark Completed"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6 border-red-500/50 text-red-500 hover:bg-red-500/10"
                                  onClick={() => handleRejectWithdrawal(t)}
                                  title="Reject & Refund User"
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
              {/* Tickets List */}
              <div className="lg:col-span-4 border-r border-border/50 pr-4 flex flex-col">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-1">Support Tickets</h2>
                  <p className="text-xs text-muted-foreground mb-3">Manage user inquiries and issues</p>

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by subject, name or email..."
                      className="pl-9 h-8 text-xs bg-muted/20"
                      value={ticketSearch}
                      onChange={(e) => setTicketSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {["all", "open", "in progress", "pending user", "resolved", "closed"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setTicketFilter(s)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all capitalize",
                          ticketFilter === s
                            ? "bg-primary/20 text-primary border-primary/50"
                            : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 space-y-2">
                  {tickets.filter(t => {
                    const matchesStatus = ticketFilter === 'all' || t.status === ticketFilter;
                    const searchLower = ticketSearch.toLowerCase();
                    const matchesSearch =
                      t.subject.toLowerCase().includes(searchLower) ||
                      (t.profiles?.full_name || "").toLowerCase().includes(searchLower) ||
                      (t.profiles?.email || "").toLowerCase().includes(searchLower);
                    return matchesStatus && matchesSearch;
                  }).length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground italic text-sm">
                      No {ticketFilter !== 'all' ? ticketFilter : ''} tickets found matching your search
                    </div>
                  ) : (
                    tickets
                      .filter(t => {
                        const matchesStatus = ticketFilter === 'all' || t.status === ticketFilter;
                        const searchLower = ticketSearch.toLowerCase();
                        const matchesSearch =
                          t.subject.toLowerCase().includes(searchLower) ||
                          (t.profiles?.full_name || "").toLowerCase().includes(searchLower) ||
                          (t.profiles?.email || "").toLowerCase().includes(searchLower);
                        return matchesStatus && matchesSearch;
                      })
                      .map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedAdminTicket(t)}
                          className={cn(
                            "p-3 rounded-lg border border-border/50 cursor-pointer transition-all hover:bg-muted/50",
                            selectedAdminTicket?.id === t.id ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : ""
                          )}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold truncate pr-2">{t.subject}</span>
                            <Badge variant="outline" className={cn(
                              "text-[10px] px-1.5 py-0 capitalize",
                              t.status === 'open' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                t.status === 'in progress' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 font-bold" :
                                  t.status === 'pending user' ? "bg-amber-500/20 text-amber-500 border-amber-500/30" :
                                    t.status === 'resolved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                      "bg-muted text-muted-foreground border-border/50"
                            )}>
                              {t.status.replace("pending user", "Pending User")}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium truncate mb-1">
                            From: {t.profiles?.full_name || t.user_id.slice(0, 8)} ({t.profiles?.email})
                          </div>
                          <div className="text-[10px] text-muted-foreground/60 text-right">
                            {new Date(t.updated_at).toLocaleString()}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Chat View */}
              <div className="lg:col-span-8 flex flex-col h-full bg-muted/10 rounded-xl overflow-hidden relative">
                {!selectedAdminTicket ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30">
                    <MessageSquareText className="h-16 w-16 mb-4" />
                    <p>Select a ticket to view conversation</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-background/50 border-b border-border flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{selectedAdminTicket.subject}</h3>
                        <p className="text-[10px] text-muted-foreground">
                          From: {selectedAdminTicket.profiles?.full_name || 'User'} ({selectedAdminTicket.profiles?.email || selectedAdminTicket.user_id.slice(0, 8)})
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Select
                          value={selectedAdminTicket.status}
                          onValueChange={async (val) => {
                            await supabase.from("support_tickets").update({ status: val }).eq("id", selectedAdminTicket.id);
                            setTickets(prev => prev.map(t => t.id === selectedAdminTicket.id ? { ...t, status: val } : t));
                            setSelectedAdminTicket({ ...selectedAdminTicket, status: val });
                            toast.success(`Ticket status updated to ${val}`);
                          }}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open (New)</SelectItem>
                            <SelectItem value="in progress">In Progress</SelectItem>
                            <SelectItem value="pending user">Pending User Reply</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => setSelectedAdminTicket(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                          title="Back to ticket list"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      {adminMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex flex-col max-w-[85%]",
                            msg.is_admin_reply ? "ml-auto items-end" : "mr-auto items-start"
                          )}
                        >
                          <div className={cn(
                            "p-3 rounded-xl text-xs leading-relaxed",
                            msg.is_admin_reply
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-background border border-border rounded-tl-none"
                          )}>
                            {msg.message}
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1">
                            {new Date(msg.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendAdminReply} className="p-4 bg-background/50 border-t border-border">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type reply..."
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

      {/* KYC Review Modal */}
      {kycUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <h2 className="text-lg font-bold text-foreground">KYC Review — {kycUser.full_name || "User"}</h2>
              <button onClick={() => setKycUser(null)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Personal details */}
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground mb-3">Personal Details</h3>
                {[
                  ["Full Name", kycUser.full_name],
                  ["Email", kycUser.id],
                  ["Phone", kycUser.phone],
                  ["Date of Birth", kycUser.date_of_birth],
                  ["Country", kycUser.country],
                  ["Account Type", kycUser.account_type],
                  ["ID Type", kycUser.id_type?.replace("_", " ")],
                  ["ID Number", kycUser.id_number],
                ].map(([label, value]) => value ? (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-medium capitalize">{value}</span>
                  </div>
                ) : null)}
              </div>

              {/* Document previews */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Identity Documents</h3>
                <DocPreview url={kycUrls.front} label="ID Front" />
                {kycUser.id_doc_back_url && <DocPreview url={kycUrls.back} label="ID Back" />}
                <DocPreview url={kycUrls.selfie} label="Selfie Holding ID" />
              </div>

              {/* Action buttons */}
              <div className="space-y-3 pt-2 border-t border-border">
                {!showRejectInput ? (
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                      disabled={kycAction}
                      onClick={handleApprove}
                    >
                      <CheckCircle className="h-4 w-4" /> Approve KYC
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 gap-2"
                      disabled={kycAction}
                      onClick={() => setShowRejectInput(true)}
                    >
                      <XCircle className="h-4 w-4" /> Reject KYC
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label>Rejection Reason <span className="text-destructive">*</span></Label>
                      <Input
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Explain why KYC is rejected (visible to user)"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                        disabled={kycAction}
                        onClick={handleReject}
                      >
                        {kycAction ? "Rejecting..." : "Confirm Rejection"}
                      </Button>
                      <Button variant="ghost" onClick={() => setShowRejectInput(false)}>Cancel</Button>
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
