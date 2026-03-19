import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import ContractCard from "@/components/dashboard/ContractCard";
import DemoContractCard from "@/components/dashboard/DemoContractCard";
import StatsBar from "@/components/dashboard/StatsBar";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Plus, FileText, ArrowRightLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Contract {
  id: string;
  title: string;
  status: string;
  total_amount: number;
  deadline: string | null;
  client_id: string;
  freelancer_id: string | null;
  otherPartyName?: string;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) fetchContracts();
  }, [user]);

  const fetchContracts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("contracts")
      .select("id, title, status, total_amount, deadline, client_id, freelancer_id")
      .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (c: any) => {
          const otherId = c.client_id === user.id ? c.freelancer_id : c.client_id;
          let otherName = "Pending";
          if (otherId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", otherId)
              .single();
            otherName = profile?.full_name || "Unknown";
          }
          return { ...c, otherPartyName: otherName };
        })
      );
      setContracts(enriched);
    }
    setLoadingContracts(false);
  };

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const myContracts = contracts.filter((c) => c.client_id === user?.id);
  const myJobs = contracts.filter((c) => c.freelancer_id === user?.id);

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
        {/* Welcome + Quick Actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName}
          </h1>
          <div className="flex gap-3">
            <Button variant="hero" asChild>
              <Link to="/contracts/new">
                <Plus className="mr-2 h-4 w-4" />
                New Contract
              </Link>
            </Button>
            <Button variant="outline" className="border-border/50">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              View All Transactions
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-8">
          <StatsBar
            walletBalance={0}
            activeContracts={myContracts.filter((c) => c.status === "active").length}
            totalEarned={0}
            pendingApproval={myContracts.filter((c) => c.status === "pending").length}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Contracts Area — 2/3 */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="contracts">
              <TabsList className="mb-6 bg-card-elevated border border-border/50">
                <TabsTrigger value="contracts">My Contracts</TabsTrigger>
                <TabsTrigger value="jobs">My Jobs</TabsTrigger>
              </TabsList>

              <TabsContent value="contracts">
                {loadingContracts ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : myContracts.length === 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DemoContractCard
                      title="Brand Identity for TechCorp"
                      status="active"
                      amount={1200}
                      deadline="Apr 15, 2026"
                      otherParty="Sarah M."
                      otherPartyRole="Freelancer"
                      milestones={{ completed: 1, total: 2 }}
                    />
                    <DemoContractCard
                      title="Website Redesign"
                      status="pending"
                      amount={3500}
                      deadline="May 1, 2026"
                      otherParty="James O."
                      otherPartyRole="Freelancer"
                      extraLabel="Awaiting deposit"
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {myContracts.map((c: any) => (
                      <ContractCard key={c.id} {...c} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="jobs">
                {loadingContracts ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : myJobs.length === 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DemoContractCard
                      title="Mobile App UI Design"
                      status="active"
                      amount={2000}
                      deadline="Apr 20, 2026"
                      otherParty="David K."
                      otherPartyRole="Client"
                      milestones={{ completed: 0, total: 3 }}
                    />
                    <DemoContractCard
                      title="Social Media Package"
                      status="completed"
                      amount={450}
                      deadline="Completed Mar 10, 2026"
                      otherParty="Amina B."
                      otherPartyRole="Client"
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {myJobs.map((c: any) => (
                      <ContractCard key={c.id} {...c} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Activity Feed — 1/3 */}
          <div>
            <ActivityFeed />
          </div>
        </div>
      </div>

      {/* Floating + button */}
      <Link
        to="/contracts/new"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-110"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
};

export default Dashboard;
