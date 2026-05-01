import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import ContractCard from "@/components/dashboard/ContractCard";
import StatsBar from "@/components/dashboard/StatsBar";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import TopUpModal from "@/components/dashboard/TopUpModal";
import WithdrawModal from "@/components/dashboard/WithdrawModal";
import PendingApprovalsModal from "@/components/dashboard/PendingApprovalsModal";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRightLeft, AlertTriangle, X, Lock, MessageSquareText, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LockedDashboardOverlay from "@/components/dashboard/LockedDashboardOverlay";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Contract {
  id: string;
  title: string;
  status: string;
  total_amount: number;
  deadline: string | null;
  client_id: string;
  freelancer_id: string | null;
  invite_email: string | null;
  otherPartyName?: string;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(0);
  const [pendingMilestones, setPendingMilestones] = useState<any[]>([]);
  const [isPendingApprovalsModalOpen, setIsPendingApprovalsModalOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [kycVerified, setKycVerified] = useState(true);
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [kycBannerDismissed, setKycBannerDismissed] = useState(false);
  const [bankDetails, setBankDetails] = useState({ bankName: "", accountName: "", accountNumber: "" });
  const [contractFilter, setContractFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [activeMainTab, setActiveMainTab] = useState("contracts");
  const [activeJobSubTab, setActiveJobSubTab] = useState("invitations");
  const [inviteBannerDismissed, setInviteBannerDismissed] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchContracts();
  }, [user, location.key]);

  const fetchContracts = async () => {
    if (!user) return;
    setLoadingContracts(true);

    try {
      const [clientRes, freelancerRes, inviteRes] = await Promise.all([
        supabase.from("contracts").select("id, title, status, total_amount, deadline, client_id, freelancer_id, invite_email").eq("client_id", user.id),
        supabase.from("contracts").select("id, title, status, total_amount, deadline, client_id, freelancer_id, invite_email").eq("freelancer_id", user.id),
        supabase.from("contracts").select("id, title, status, total_amount, deadline, client_id, freelancer_id, invite_email").ilike("invite_email", user.email || ""),
      ]);

      const mergedContracts = [
        ...(clientRes.data || []),
        ...(freelancerRes.data || []),
        ...(inviteRes.data || []),
      ];

      const uniqueContracts = Array.from(new Map(mergedContracts.map((c) => [c.id, c])).values());

      if (uniqueContracts.length > 0) {
        const enriched = await Promise.all(
          uniqueContracts.map(async (c: any) => {
            try {
              const otherId = c.client_id === user.id ? c.freelancer_id : c.client_id;
              let otherName = t("common.pending");
              if (otherId) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("id", otherId)
                  .maybeSingle();

                otherName = profile?.full_name || c.invite_email || t("common.unknownUser");
              } else {
                otherName = c.invite_email || t("dashboard.awaitingAcceptance");
              }
              return { ...c, otherPartyName: otherName };
            } catch (err) {
              console.error("Error enriching contract:", err);
              return { ...c, otherPartyName: c.invite_email || t("common.unknown") };
            }
          })
        );
        setContracts(enriched);
      } else {
        setContracts([]);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance, kyc_verified, id_doc_front_url, bank_name, bank_account_name, bank_account_number, consent_given")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profile) {
        if (!profile.consent_given) {
          navigate("/consent" + (location.pathname !== "/dashboard" ? `?redirect=${encodeURIComponent(location.pathname)}` : ""));
          return;
        }

        setWalletBalance(profile.wallet_balance || 0);
        setKycVerified(profile.kyc_verified || false);
        setKycSubmitted(!!profile.id_doc_front_url);
        setBankDetails({
          bankName: profile.bank_name || "",
          accountName: profile.bank_account_name || "",
          accountNumber: profile.bank_account_number || ""
        });
      }

      const freelancerTxsQuery = supabase.from("transactions").select("amount").eq("to_user_id", user.id).eq("type", "release");
      const clientTxsQuery = supabase.from("transactions").select("amount").eq("from_user_id", user.id).eq("type", "release");
      
      const [{ data: earnedTxs }] = await Promise.all([freelancerTxsQuery, clientTxsQuery]);
      const earned = earnedTxs?.reduce((acc, tx) => acc + (tx.amount || 0), 0) || 0;
      setTotalEarned(earned);

      const { data: milestonesInReview, count } = await supabase
        .from("milestones")
        .select("id, title, amount, contract_id, contracts!inner(title, client_id, freelancer_id)", { count: "exact" })
        .eq("status", "in_review")
        .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`, { foreignTable: "contracts" });
      
      setPendingApproval(count || 0);
      setPendingMilestones(milestonesInReview || []);
    } catch (err) {
      console.error("Critical error in fetchContracts:", err);
    } finally {
      setLoadingContracts(false);
    }
  };

  const totalOngoingCount = contracts.filter(c => c.status === "active").length;

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    t("common.explorer");

  const myContracts = contracts.filter((c) => c.client_id === user?.id);
  
  const myJobs = contracts.filter((c) => 
    c.freelancer_id === user?.id || 
    (c.invite_email?.toLowerCase() === user?.email?.toLowerCase() && c.client_id !== user?.id)
  );

  const myInvitations = contracts.filter((c) => 
    (c.status === "pending" || c.status === "funded" || c.status === "revision_requested") &&
    c.invite_email?.toLowerCase() === user?.email?.toLowerCase() &&
    c.client_id !== user?.id
  );

  const activeJobs = myJobs.filter(c => ["accepted", "active", "disputed"].includes(c.status));
  const historyJobs = myJobs.filter(c => ["completed", "cancelled"].includes(c.status));
  
  const totalContractCount = myContracts.filter(c => ["pending", "accepted", "active", "disputed", "revision_requested"].includes(c.status)).length + 
                           myContracts.filter(c => ["completed", "cancelled"].includes(c.status)).length;
  
  const totalJobCount = myInvitations.length + activeJobs.length + historyJobs.length;

  const pendingNewInvitations = myInvitations.filter(c => !c.freelancer_id);

  const isNewlyRegistered = !kycVerified && !kycSubmitted;
  const isPendingApproval = !kycVerified && kycSubmitted;

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        {t("common.loading")}
      </div>
    );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return { text: t("dashboard.greetings.morning"), emoji: "🌅" };
    if (hour >= 12 && hour < 17) return { text: t("dashboard.greetings.afternoon"), emoji: "☀️" };
    if (hour >= 17 && hour < 21) return { text: t("dashboard.greetings.evening"), emoji: "🌆" };
    return { text: t("dashboard.greetings.night"), emoji: "🌙" };
  };

  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />

      <div className="container mx-auto px-4 py-6 md:py-8">

        {/* KYC pending banner */}
        {!kycVerified && (
          <div className={`mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border px-4 py-3 gap-3 ${
            isPendingApproval 
              ? "border-amber-500/50 bg-amber-500/20 text-amber-800 dark:text-amber-200" 
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          }`}>
            <div className="flex items-start sm:items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
              <span className="font-medium">
                {isPendingApproval 
                  ? t("dashboard.kyc.pendingMsg")
                  : t("dashboard.kyc.incompleteMsg")}
              </span>
              {!isPendingApproval && (
                <button
                  onClick={() => navigate("/kyc")}
                  className="underline font-bold ml-1 hover:text-amber-600 dark:hover:text-amber-300 transition-colors whitespace-nowrap"
                >
                  {t("dashboard.kyc.completeBtn")}
                </button>
              )}
            </div>
            {kycVerified && (
              <button
                onClick={() => setKycBannerDismissed(true)}
                className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Invitation Alert Banner */}
        {!inviteBannerDismissed && myInvitations.length > 0 && (
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between rounded-lg border border-teal-500/30 bg-teal-500/10 dark:bg-teal-500/5 px-4 py-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Bell className="h-4 w-4" />
              </div>
              <span className="font-medium text-teal-900 dark:text-teal-100">
                {myInvitations.length === 1 ? (
                  <span>
                    {t("dashboard.invitations.bannerSingle", { 
                      defaultValue: "You have a contract invitation from {{client}} for {{title}}",
                      client: myInvitations[0].otherPartyName || t("common.aClient"),
                      title: myInvitations[0].title 
                    })}
                  </span>
                ) : (
                  <span>
                    {t("dashboard.invitations.bannerMultiple", { 
                      defaultValue: "You have {{count}} pending contract invitations waiting for your response",
                      count: myInvitations.length 
                    })}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="hero" 
                size="sm" 
                className="bg-teal-500 hover:bg-teal-600 text-white border-none shadow-sm h-8 px-4 text-xs"
                onClick={() => {
                  setActiveMainTab("jobs");
                  setActiveJobSubTab("invitations");
                  window.scrollTo({ top: document.querySelector('#main-tabs')?.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
                }}
              >
                {t("dashboard.invitations.viewBtn", { defaultValue: "View Invitations" })}
              </Button>
              <button 
                onClick={() => setInviteBannerDismissed(true)}
                className="p-1 hover:bg-teal-500/10 rounded-full text-teal-600 dark:text-teal-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Welcome + Quick Actions */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {greeting.text}, {firstName} {greeting.emoji}
            </h1>
            {isPendingApproval && (
              <p className="text-xs text-amber-600 dark:text-amber-500/80 flex items-center gap-1">
                <Lock className="h-3 w-3" /> {t("dashboard.lockedFeatures")}
              </p>
            )}
          </div>
          <div className="hidden sm:flex gap-3">
            <Button variant="hero" asChild disabled={isPendingApproval} className={`h-11 sm:h-10 ${isPendingApproval ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}>
              <Link to="/contracts/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("dashboard.actions.newContract")}
              </Link>
            </Button>
            <Button variant="outline" className="h-11 sm:h-10 border-border/50" disabled={isPendingApproval} asChild>
              <Link to="/transactions">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {t("dashboard.actions.viewTransactions")}
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-8">
          <StatsBar
            walletBalance={walletBalance}
            activeContracts={totalOngoingCount}
            totalEarned={totalEarned}
            pendingApproval={pendingApproval}
            onTopUp={() => setIsTopUpOpen(true)}
            onWithdraw={() => setIsWithdrawOpen(true)}
            onPendingApprovalClick={() => setIsPendingApprovalsModalOpen(true)}
            disabled={isPendingApproval}
          />
        </div>

        {/* Main Content Grid with Locking */}
        <div className="relative" id="main-tabs">
          {isNewlyRegistered && <LockedDashboardOverlay />}
          <div className={`grid gap-8 lg:grid-cols-3 ${isNewlyRegistered ? "blur-sm pointer-events-none select-none" : ""}`}>
            {/* Contracts Area */}
            <div className="lg:col-span-2">
              <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-muted/20 p-1 rounded-xl h-12">
                  <TabsTrigger value="contracts" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                    {t("dashboard.tabs.myContracts")}
                    {totalContractCount > 0 && (
                      <span className="ml-2 flex h-4 min-w-4 px-1.5 items-center justify-center rounded-full bg-black/10 text-[10px] font-bold">
                        {totalContractCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="jobs" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md relative">
                    {t("dashboard.tabs.myJobs")}
                    {totalJobCount > 0 && (
                      <span className="ml-2 flex h-4 min-w-4 px-1.5 items-center justify-center rounded-full bg-black/10 text-[10px] font-bold">
                        {totalJobCount}
                      </span>
                    )}
                    {myInvitations.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* My Contracts Main Tab */}
                <TabsContent value="contracts" className="space-y-6">
                  <Tabs defaultValue="active">
                    <TabsList className="flex w-max gap-2 bg-transparent h-auto p-0 mb-4">
                      <TabsTrigger value="active" className="h-9 px-4 rounded-full border border-border data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 transition-all text-xs font-bold uppercase tracking-wider">
                        {t("common.status.active")}
                        {myContracts.filter(c => ["active", "accepted", "pending", "revision_requested", "disputed"].includes(c.status)).length > 0 && (
                          <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-[10px]">
                            {myContracts.filter(c => ["active", "accepted", "pending", "revision_requested", "disputed"].includes(c.status)).length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="history" className="h-9 px-4 rounded-full border border-border data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 transition-all text-xs font-bold uppercase tracking-wider">
                        {t("common.filter.history", { defaultValue: "History" })}
                        {myContracts.filter(c => ["completed", "cancelled"].includes(c.status)).length > 0 && (
                          <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-[10px]">
                            {myContracts.filter(c => ["completed", "cancelled"].includes(c.status)).length}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="active">
                      {loadingContracts ? (
                        <p className="text-muted-foreground italic">{t("dashboard.contracts.loading")}</p>
                      ) : (() => {
                        const activeContracts = myContracts.filter(c => ["active", "accepted", "pending", "revision_requested", "disputed"].includes(c.status));
                        return activeContracts.length === 0 ? (
                          <div className="flex h-48 flex-col items-center justify-center glass-card border-dashed text-center p-6 space-y-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Plus className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{t("dashboard.contracts.none")}</p>
                              <p className="mb-6 text-sm text-muted-foreground/80 dark:text-muted-foreground/60">
                                {t("dashboard.contracts.noneDesc")}
                              </p>
                            </div>
                            <Button variant="hero" size="sm" asChild disabled={isPendingApproval} className={isPendingApproval ? "opacity-50 pointer-events-none" : ""}>
                              <Link to="/contracts/new">{t("dashboard.contracts.createFirst")}</Link>
                            </Button>
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {activeContracts.map((c: any) => (
                              <ContractCard key={c.id} {...c} disabled={isPendingApproval} />
                            ))}
                          </div>
                        );
                      })()}
                    </TabsContent>

                    <TabsContent value="history">
                      {(() => {
                        const historyContracts = myContracts.filter(c => ["completed", "cancelled"].includes(c.status));
                        const filtered = contractFilter === "all" ? historyContracts : historyContracts.filter(c => c.status === contractFilter);
                        
                        return historyContracts.length === 0 ? (
                          <div className="flex h-40 flex-col items-center justify-center glass-card border-dashed text-center px-4">
                            <p className="text-muted-foreground italic">{t("dashboard.contracts.noSpecific", { filter: "history" })}</p>
                          </div>
                        ) : (
                          <div className="glass-card overflow-hidden">
                            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/20">
                              <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">{t("common.filter.history")}</h3>
                              <div className="flex gap-2">
                                {["all", "completed", "cancelled"].map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => setContractFilter(s)}
                                    className={cn(
                                      "px-3 py-1 rounded-full text-[10px] font-bold border transition-all uppercase tracking-tighter",
                                      contractFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"
                                    )}
                                  >
                                    {t(`common.status.${s}`, { defaultValue: s })}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-muted/30 text-[10px] uppercase font-black text-muted-foreground border-b border-border/50">
                                  <tr>
                                    <th className="px-4 py-3">{t("dashboard.history.table.title", { defaultValue: "Project" })}</th>
                                    <th className="px-4 py-3">{t("dashboard.history.table.other", { defaultValue: "Professional" })}</th>
                                    <th className="px-4 py-3">{t("dashboard.history.table.amount", { defaultValue: "Amount" })}</th>
                                    <th className="px-4 py-3">{t("dashboard.history.table.status", { defaultValue: "Status" })}</th>
                                    <th className="px-4 py-3 text-right">{t("common.actions", { defaultValue: "Actions" })}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {filtered.map((c: any) => (
                                    <tr key={c.id} className="hover:bg-muted/20 transition-colors group">
                                      <td className="px-4 py-4 font-bold">{c.title}</td>
                                      <td className="px-4 py-4 text-xs opacity-70">{c.otherPartyName}</td>
                                      <td className="px-4 py-4 font-mono font-bold text-xs">${c.total_amount.toLocaleString()}</td>
                                      <td className="px-4 py-4">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                          c.status === 'completed' ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
                                        )}>
                                          {t(`common.status.${c.status}`, { defaultValue: c.status })}
                                        </span>
                                      </td>
                                      <td className="px-4 py-4 text-right">
                                        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                                          <Link to={`/contracts/${c.id}`}>{t("common.view")}</Link>
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* My Jobs Main Tab */}
                <TabsContent value="jobs" className="space-y-6">
                  <Tabs value={activeJobSubTab} onValueChange={setActiveJobSubTab}>
                    <TabsList className="flex w-max gap-2 bg-transparent h-auto p-0 mb-4">
                      <TabsTrigger value="invitations" className="h-9 px-4 rounded-full border border-border data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive data-[state=active]:border-destructive/50 transition-all text-xs font-bold uppercase tracking-wider">
                        {t("dashboard.tabs.invitations")}
                        {myInvitations.length > 0 && (
                          <span className="ml-2 bg-destructive/20 text-destructive px-1.5 rounded-full text-[10px]">
                            {myInvitations.length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="active" className="h-9 px-4 rounded-full border border-border data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 transition-all text-xs font-bold uppercase tracking-wider">
                        {t("common.status.active")}
                        {myJobs.filter(c => ["active", "accepted", "disputed"].includes(c.status)).length > 0 && (
                          <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-[10px]">
                            {myJobs.filter(c => ["active", "accepted", "disputed"].includes(c.status)).length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="history" className="h-9 px-4 rounded-full border border-border data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/50 transition-all text-xs font-bold uppercase tracking-wider">
                        {t("common.filter.history", { defaultValue: "History" })}
                        {myJobs.filter(c => ["completed", "cancelled"].includes(c.status)).length > 0 && (
                          <span className="ml-2 bg-primary/20 text-primary px-1.5 rounded-full text-[10px]">
                            {myJobs.filter(c => ["completed", "cancelled"].includes(c.status)).length}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="invitations">
                      {loadingContracts ? (
                        <p className="text-muted-foreground">{t("common.loading")}</p>
                      ) : myInvitations.length === 0 ? (
                        <div className="flex h-40 flex-col items-center justify-center glass-card border-dashed text-center px-4">
                          <MessageSquareText className="mb-2 h-8 w-8 opacity-40 dark:opacity-20" />
                          <p className="mb-1 text-sm font-medium">{t("dashboard.invitations.none")}</p>
                          <p className="text-xs opacity-80 dark:opacity-60">{t("dashboard.invitations.noneDesc")}</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {myInvitations.map((c: any) => (
                            <ContractCard key={c.id} {...c} disabled={isPendingApproval} />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="active">
                      {(() => {
                        const activeJobs = myJobs.filter(c => ["active", "accepted", "disputed"].includes(c.status));
                        return activeJobs.length === 0 ? (
                          <div className="flex h-40 flex-col items-center justify-center glass-card border-dashed text-center">
                            <Plus className="mb-2 h-8 w-8 opacity-40 dark:opacity-20" />
                            <p className="text-sm font-medium">{t("dashboard.jobs.none")}</p>
                            <p className="text-xs mt-1 opacity-80 dark:opacity-60">{t("dashboard.jobs.noneDesc")}</p>
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {activeJobs.map((c: any) => (
                              <ContractCard key={c.id} {...c} disabled={isPendingApproval} />
                            ))}
                          </div>
                        );
                      })()}
                    </TabsContent>

                    <TabsContent value="history">
                      {(() => {
                        const filtered = jobFilter === "all" ? historyJobs : historyJobs.filter(c => c.status === jobFilter);
                        
                        return historyJobs.length === 0 ? (
                          <div className="flex h-40 flex-col items-center justify-center glass-card border-dashed text-center px-4">
                            <p className="text-muted-foreground italic">{t("dashboard.jobs.noSpecific", { filter: "history" })}</p>
                          </div>
                        ) : (
                          <div className="glass-card overflow-hidden">
                            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/20">
                              <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">{t("common.filter.history")}</h3>
                              <div className="flex gap-2">
                                {["all", "completed", "cancelled"].map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => setJobFilter(s)}
                                    className={cn(
                                      "px-3 py-1 rounded-full text-[10px] font-bold border transition-all uppercase tracking-tighter",
                                      jobFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"
                                    )}
                                  >
                                    {t(`common.status.${s}`, { defaultValue: s })}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-muted/30 text-[10px] uppercase font-black text-muted-foreground border-b border-border/50">
                                  <tr>
                                    <th className="px-4 py-3">{t("dashboard.history.table.title", { defaultValue: "Project" })}</th>
                                    <th className="px-4 py-3">{t("dashboard.history.table.other", { defaultValue: "Client" })}</th>
                                    <th className="px-4 py-3">{t("dashboard.history.table.amount", { defaultValue: "Amount" })}</th>
                                    <th className="px-4 py-3">{t("dashboard.history.table.status", { defaultValue: "Status" })}</th>
                                    <th className="px-4 py-3 text-right">{t("common.actions", { defaultValue: "Actions" })}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {filtered.map((c: any) => (
                                    <tr key={c.id} className="hover:bg-muted/20 transition-colors group">
                                      <td className="px-4 py-4 font-bold">{c.title}</td>
                                      <td className="px-4 py-4 text-xs opacity-70">{c.otherPartyName}</td>
                                      <td className="px-4 py-4 font-mono font-bold text-xs">${c.total_amount.toLocaleString()}</td>
                                      <td className="px-4 py-4">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                          c.status === 'completed' ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
                                        )}>
                                          {c.status === 'cancelled' ? t("common.status.rejected", { defaultValue: "Rejected" }) : t(`common.status.${c.status}`, { defaultValue: c.status })}
                                        </span>
                                      </td>
                                      <td className="px-4 py-4 text-right">
                                        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                                          <Link to={`/contracts/${c.id}`}>{t("common.view")}</Link>
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>
            </div>

            {/* Activity Feed */}
            <div className={isPendingApproval ? "opacity-30 grayscale pointer-events-none" : ""}>
              <ActivityFeed />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Support Bubble */}
      <Link
        to="/support"
        className="fixed bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-full bg-card border border-border shadow-2xl transition-all hover:scale-110 hover:shadow-primary/20 group z-50 overflow-hidden"
      >
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <MessageSquareText className="h-6 w-6 text-primary" />
        <span className="absolute left-16 bg-card border border-border px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-xl">
          {t("nav.helpSupport")}
        </span>
      </Link>

      {/* Floating + button */}
      {!isPendingApproval && !isNewlyRegistered && (
        <Link
          to="/contracts/new"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-110"
        >
          <Plus className="h-6 w-6" />
        </Link>
      )}

      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      <WithdrawModal 
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        walletBalance={walletBalance}
        kycVerified={kycVerified}
        userId={user?.id || ""}
        bankDetails={bankDetails}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      <PendingApprovalsModal
        isOpen={isPendingApprovalsModalOpen}
        onClose={() => setIsPendingApprovalsModalOpen(false)}
        milestones={pendingMilestones}
      />
    </div>
  );
};

export default Dashboard;