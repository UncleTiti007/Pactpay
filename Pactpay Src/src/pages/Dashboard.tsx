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
import { Button } from "@/components/ui/button";
import { Plus, FileText, ArrowRightLeft, AlertTriangle, X, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LockedDashboardOverlay from "@/components/dashboard/LockedDashboardOverlay";

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
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(0);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [kycVerified, setKycVerified] = useState(true);
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [kycBannerDismissed, setKycBannerDismissed] = useState(false);
  const [bankDetails, setBankDetails] = useState({ bankName: "", accountName: "", accountNumber: "" });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading]);

  // Refetch every time user navigates to dashboard — fixes stale data after delete
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
              let otherName = "Pending";
              if (otherId) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("id", otherId)
                  .maybeSingle();

                otherName = profile?.full_name || c.invite_email || "Unknown User";
              } else {
                otherName = c.invite_email || "Awaiting acceptance";
              }
              return { ...c, otherPartyName: otherName };
            } catch (err) {
              console.error("Error enriching contract:", err);
              return { ...c, otherPartyName: c.invite_email || "Unknown" };
            }
          })
        );
        setContracts(enriched);
      } else {
        setContracts([]);
      }

      // Fetch profile: wallet, KYC status, and bank info
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_balance, kyc_verified, id_doc_front_url, bank_name, bank_account_name, bank_account_number")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profile) {
        setWalletBalance(profile.wallet_balance || 0);
        setKycVerified(profile.kyc_verified || false);
        setKycSubmitted(!!profile.id_doc_front_url);
        setBankDetails({
          bankName: profile.bank_name || "",
          accountName: profile.bank_account_name || "",
          accountNumber: profile.bank_account_number || ""
        });
      }

      // Total earned/spent
      const freelancerTxsQuery = supabase.from("transactions").select("amount").eq("to_user_id", user.id).eq("type", "release");
      const clientTxsQuery = supabase.from("transactions").select("amount").eq("from_user_id", user.id).eq("type", "release");
      
      const [{ data: earnedTxs }, { data: spentTxs }] = await Promise.all([freelancerTxsQuery, clientTxsQuery]);
      
      const earned = earnedTxs?.reduce((acc, tx) => acc + (tx.amount || 0), 0) || 0;
      const spent = spentTxs?.reduce((acc, tx) => acc + (tx.amount || 0), 0) || 0;
      
      setTotalEarned(earned);

      // Pending action count - milestones in review where user is either client or freelancer
      const { count } = await supabase
        .from("milestones")
        .select("id, contracts!inner(client_id, freelancer_id)", { count: "exact" })
        .eq("status", "in_review")
        .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`, { foreignTable: "contracts" });
      
      setPendingApproval(count || 0);
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
    "Explorer";

  const myContracts = contracts.filter((c) => c.client_id === user?.id);
  const myJobs = contracts.filter((c) => c.freelancer_id === user?.id && c.status !== "pending" && c.status !== "rejected");
  const myInvitations = contracts.filter((c) => 
    (c.freelancer_id === user?.id || c.invite_email?.toLowerCase() === user?.email?.toLowerCase()) && 
    c.status === "pending"
  );

  const isNewlyRegistered = !kycVerified && !kycSubmitted;
  const isPendingApproval = !kycVerified && kycSubmitted;

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />

      <div className="container mx-auto px-4 py-8">

        {/* KYC pending banner */}
        {!kycVerified && (
          <div className={`mb-6 flex items-center justify-between rounded-lg border px-4 py-3 ${
            isPendingApproval 
              ? "border-amber-500/50 bg-amber-500/20 text-amber-200" 
              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
          }`}>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">
                {isPendingApproval 
                  ? "Verification Pending: Your account is currently in 'View-Only' mode while our team reviews your documents."
                  : "Identity Incomplete: Please complete your KYC to unlock dashboard features."}
              </span>
              {!isPendingApproval && (
                <button
                  onClick={() => navigate("/kyc")}
                  className="underline font-bold ml-1 hover:text-amber-300 transition-colors"
                >
                  Complete KYC
                </button>
              )}
            </div>
            {kycVerified && (
              <button
                onClick={() => setKycBannerDismissed(true)}
                className="ml-4 text-amber-400 hover:text-amber-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Welcome + Quick Actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {firstName}
            </h1>
            {isPendingApproval && (
              <p className="text-xs text-amber-500/80 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Dashboard features are locked during verification
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="hero" asChild disabled={isPendingApproval} className={isPendingApproval ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}>
              <Link to="/contracts/new">
                <Plus className="mr-2 h-4 w-4" />
                New Contract
              </Link>
            </Button>
            <Button variant="outline" className="border-border/50" disabled={isPendingApproval} asChild>
              <Link to="/transactions">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                View All Transactions
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
            disabled={isPendingApproval}
          />
        </div>

        {/* Main Content Grid with Locking */}
        <div className="relative">
          {isNewlyRegistered && <LockedDashboardOverlay />}
          
          <div className={`grid gap-8 lg:grid-cols-3 ${isNewlyRegistered ? "blur-sm pointer-events-none select-none" : ""}`}>
            {/* Contracts Area */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="contracts">
                <TabsList className={`mb-6 bg-card-elevated border border-border/50 ${isPendingApproval ? "opacity-50 pointer-events-none" : ""}`}>
                  <TabsTrigger value="contracts">My Contracts</TabsTrigger>
                  <TabsTrigger value="invitations" className="relative">
                    Invitations
                    {myInvitations.length > 0 && (
                      <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {myInvitations.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="jobs">My Jobs</TabsTrigger>
                </TabsList>

                <TabsContent value="contracts">
                  {loadingContracts ? (
                    <p className="text-muted-foreground italic">Fetching your contracts...</p>
                  ) : myContracts.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/30 text-center p-6 space-y-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">No contracts found</p>
                        <p className="text-sm text-muted-foreground">Ready to start your next collaboration?</p>
                      </div>
                      <Button variant="hero" size="sm" asChild disabled={isPendingApproval} className={isPendingApproval ? "opacity-50 pointer-events-none" : ""}>
                        <Link to="/contracts/new">Create your first contract</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {myContracts.map((c: any) => (
                        <ContractCard key={c.id} {...c} disabled={isPendingApproval} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="invitations">
                  {loadingContracts ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : myInvitations.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground text-center px-4">
                      <FileText className="mb-2 h-8 w-8 opacity-20" />
                      <p className="mb-1">No pending invitations</p>
                      <p className="text-xs opacity-60">New invitations from clients will appear here for you to accept or reject.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {myInvitations.map((c: any) => (
                        <ContractCard key={c.id} {...c} disabled={isPendingApproval} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="jobs">
                  {loadingContracts ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : myJobs.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                      <FileText className="mb-2 h-8 w-8 opacity-20" />
                      <p>No jobs yet</p>
                      <p className="text-xs mt-1 opacity-60">Jobs appear here when someone invites you to a contract</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {myJobs.map((c: any) => (
                        <ContractCard key={c.id} {...c} disabled={isPendingApproval} />
                      ))}
                    </div>
                  )}
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
    </div>
  );
};

export default Dashboard;