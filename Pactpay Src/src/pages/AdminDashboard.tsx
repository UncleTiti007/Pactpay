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
import { X, FileText, ImageIcon, CheckCircle, XCircle, Search, Filter, ShieldAlert, ShieldCheck, Lock, Unlock, MoreVertical } from "lucide-react";
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

  // KYC Review Modal
  const [kycUser, setKycUser] = useState<any>(null);
  const [kycUrls, setKycUrls] = useState<{ front: string | null; back: string | null; selfie: string | null }>({ front: null, back: null, selfie: null });

  // Filtering states
  const [userSearch, setUserSearch] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [disputeSearch, setDisputeSearch] = useState("");

  const [userFilter, setUserFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [txFilter, setTxFilter] = useState("all");
  const [disputeFilter, setDisputeFilter] = useState("all");
  const [kycAction, setKycAction] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [activeTab, setActiveTab] = useState("disputes");

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
    } catch (err) { 
      console.error("Admin check failed:", err);
      navigate("/dashboard"); 
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    const [cRes, uRes, dRes, tRes] = await Promise.all([
      supabase.from("contracts").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("disputes").select("*, contracts(title), milestones(name, amount)").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false })
    ]);
    setContracts(cRes.data || []);
    setUsers(uRes.data || []);
    setDisputes(dRes.data || []);
    setTransactions(tRes.data || []);
    setLoading(false);
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
  
  // Calculate Active Escrow: Total Escrow In - (Released + Refunded)
  const totalEscrowIn = transactions.filter(t => t.type === "escrow").reduce((sum, t) => sum + t.amount, 0);
  const totalEscrowOut = transactions.filter(t => t.type === "release" || t.type === "refund").reduce((sum, t) => sum + t.amount, 0);
  const activeEscrow = totalEscrowIn - totalEscrowOut;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Control Panel</h1>
            <p className="text-muted-foreground mt-1">Platform overview and dispute resolution center</p>
          </div>
          <div className="flex gap-4">
            <div className="glass-card px-6 py-3 flex flex-col border-primary/20 bg-primary/5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground whitespace-nowrap">Platform Revenue</span>
              <span className="text-xl font-bold text-primary">${totalRevenue.toLocaleString()}</span>
            </div>
            <div className="glass-card px-6 py-3 flex flex-col border-amber-500/20 bg-amber-500/5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground whitespace-nowrap">Active Escrow</span>
              <span className="text-xl font-bold text-amber-500">${activeEscrow.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card glass-card">
            <TabsTrigger value="disputes">Active Disputes ({disputes.filter(d => d.status === 'open').length})</TabsTrigger>
            <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="transactions">Transactions ({transactions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="disputes" className="glass-card p-6">
            <div className="mb-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Disputes Needing Resolution</h2>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search disputes..." 
                    className="pl-9"
                    value={disputeSearch}
                    onChange={(e) => setDisputeSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "open", "resolved"].map((s) => (
                  <Button 
                    key={s}
                    size="sm" 
                    variant={disputeFilter === s ? "hero" : "outline"}
                    className="capitalize"
                    onClick={() => setDisputeFilter(s)}
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
                    <TableHead>Contract</TableHead><TableHead>Milestone</TableHead>
                    <TableHead>Amount Locked</TableHead><TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes
                    .filter(d => 
                      ((d.contracts?.title || "").toLowerCase().includes(disputeSearch.toLowerCase()) ||
                       (d.reason || "").toLowerCase().includes(disputeSearch.toLowerCase())) &&
                      (disputeFilter === "all" || d.status === disputeFilter)
                    )
                    .length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No disputes found</TableCell></TableRow>}
                  {disputes
                    .filter(d => 
                      ((d.contracts?.title || "").toLowerCase().includes(disputeSearch.toLowerCase()) ||
                       (d.reason || "").toLowerCase().includes(disputeSearch.toLowerCase())) &&
                      (disputeFilter === "all" || d.status === disputeFilter)
                    )
                    .map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.contracts?.title}</TableCell>
                      <TableCell>{d.milestones?.name}</TableCell>
                      <TableCell className="font-semibold">${d.milestones?.amount?.toLocaleString()}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground" title={d.reason}>{d.reason}</TableCell>
                      <TableCell><Badge variant={d.status === "open" ? "destructive" : "outline"}>{d.status}</Badge></TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        {d.status === "open" && (
                          <>
                            <Button size="sm" variant="hero" disabled={resolving} onClick={() => handleResolveDispute(d.id, "release")}>Release to Freelancer</Button>
                            <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled={resolving} onClick={() => handleResolveDispute(d.id, "refund")}>Refund Client</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                    <TableHead>Title</TableHead><TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead><TableHead>Client ID</TableHead><TableHead>Freelancer ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts
                    .filter(c => 
                      (c.title.toLowerCase().includes(contractSearch.toLowerCase()) || 
                       c.id.toLowerCase().includes(contractSearch.toLowerCase())) &&
                      (contractFilter === "all" || c.status === contractFilter)
                    )
                    .map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      <TableCell>${c.total_amount?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{c.client_id}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{c.freelancer_id || 'Pending'}</TableCell>
                    </TableRow>
                  ))}
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
                          ? <Badge className="bg-green-600/20 text-green-500 border-green-600/30">Verified</Badge>
                          : u.id_doc_front_url
                            ? <Badge className="bg-amber-600/20 text-amber-500 border-amber-600/30">Pending</Badge>
                            : <Badge variant="outline" className="text-muted-foreground">No KYC</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        {u.account_status === 'deactivated' 
                          ? <Badge className="bg-red-500/20 text-red-500 border-red-500/30 flex w-fit gap-1 items-center"><XCircle className="h-3 w-3" /> Deactivated</Badge>
                          : u.account_status === 'locked'
                            ? <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 flex w-fit gap-1 items-center"><Lock className="h-3 w-3" /> Locked</Badge>
                            : <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 flex w-fit gap-1 items-center"><CheckCircle className="h-3 w-3" /> Active</Badge>
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
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search ledger..." 
                    className="pl-9"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "deposit", "escrow", "release", "refund", "fee"].map((s) => (
                  <Button 
                    key={s}
                    size="sm" 
                    variant={txFilter === s ? "hero" : "outline"}
                    className="capitalize"
                    onClick={() => setTxFilter(s)}
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
                    <TableHead>Type</TableHead><TableHead>Amount</TableHead>
                    <TableHead>To / From</TableHead><TableHead>Tx ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .filter(t => 
                      (t.type.toLowerCase().includes(txSearch.toLowerCase()) || 
                       t.id.toLowerCase().includes(txSearch.toLowerCase()) ||
                       (t.to_user_id || "").toLowerCase().includes(txSearch.toLowerCase()) ||
                       (t.from_user_id || "").toLowerCase().includes(txSearch.toLowerCase())) &&
                      (txFilter === "all" || t.type === txFilter || (txFilter === "deposit" && t.type === "wallet_topup"))
                    )
                    .map(t => (
                    <TableRow key={t.id}>
                      <TableCell><Badge variant="outline" className="uppercase">{t.type}</Badge></TableCell>
                      <TableCell className={`font-semibold ${(t.type === 'deposit' || t.type === 'wallet_topup') ? 'text-blue-500' : t.type === 'fee' ? 'text-destructive' : 'text-primary'}`}>
                        ${t.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[200px]" title={t.to_user_id || t.from_user_id}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-foreground overflow-hidden text-ellipsis italic opacity-70">
                            {t.metadata?.contract_title || "Pactpay Transaction"}
                          </span>
                          <span>{t.to_user_id ? `To: ${t.to_user_id}` : `From: ${t.from_user_id}`}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">{t.id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
