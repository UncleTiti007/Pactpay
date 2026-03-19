import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertTriangle, DollarSign } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-status-draft/20 text-status-draft border-status-draft/30",
  pending: "bg-status-pending/20 text-status-pending border-status-pending/30",
  active: "bg-status-active/20 text-status-active border-status-active/30",
  completed: "bg-status-completed/20 text-status-completed border-status-completed/30",
  disputed: "bg-status-disputed/20 text-status-disputed border-status-disputed/30",
  cancelled: "bg-status-cancelled/20 text-status-cancelled border-status-cancelled/30",
};

const milestoneStatusIcons: Record<string, any> = {
  pending: Clock,
  in_progress: Clock,
  completed: CheckCircle,
  disputed: AlertTriangle,
};

const ContractDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [freelancerName, setFreelancerName] = useState("");

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

    // Fetch milestones
    const { data: ms } = await supabase
      .from("milestones")
      .select("*")
      .eq("contract_id", id)
      .order("order_index", { ascending: true });

    setMilestones(ms || []);

    // Fetch names
    if (c.client_id) {
      const { data: cp } = await supabase.from("profiles").select("full_name").eq("id", c.client_id).single();
      setClientName(cp?.full_name || "Unknown");
    }
    if (c.freelancer_id) {
      const { data: fp } = await supabase.from("profiles").select("full_name").eq("id", c.freelancer_id).single();
      setFreelancerName(fp?.full_name || "Pending");
    }

    setLoading(false);
  };

  const isClient = user?.id === contract?.client_id;
  const isFreelancer = user?.id === contract?.freelancer_id;

  const approveMilestone = async (milestoneId: string) => {
    const { error } = await supabase
      .from("milestones")
      .update({ status: "completed" })
      .eq("id", milestoneId);

    if (error) toast.error("Failed to approve");
    else {
      toast.success("Milestone approved!");
      fetchContract();
    }
  };

  const markReady = async (milestoneId: string) => {
    const { error } = await supabase
      .from("milestones")
      .update({ status: "in_review" })
      .eq("id", milestoneId);

    if (error) toast.error("Failed to update");
    else {
      toast.success("Marked as ready for review!");
      fetchContract();
    }
  };

  if (loading || authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  if (!contract) return null;

  const completedAmount = milestones.filter((m) => m.status === "completed").reduce((s: number, m: any) => s + (m.amount || 0), 0);
  const escrowAmount = contract.total_amount - completedAmount;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{contract.title}</h1>
              <Badge variant="outline" className={statusColors[contract.status] || statusColors.draft}>
                {contract.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Client: {clientName} · Freelancer: {freelancerName}
            </p>
          </div>

          {isClient && contract.status === "pending" && (
            <Button className="bg-status-pending text-primary-foreground hover:bg-status-pending/90">
              <DollarSign className="mr-1 h-4 w-4" /> Deposit Funds
            </Button>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Details + Milestones */}
          <div className="lg:col-span-2 space-y-6">
            {contract.description && (
              <div className="glass-card p-5">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Scope of Work</h3>
                <p className="text-sm leading-relaxed text-foreground">{contract.description}</p>
              </div>
            )}

            <div className="glass-card p-5">
              <h3 className="mb-4 font-semibold text-foreground">Milestones</h3>
              <div className="space-y-3">
                {milestones.map((m: any) => {
                  const Icon = milestoneStatusIcons[m.status] || Clock;
                  return (
                    <div key={m.id} className="rounded-lg border border-border bg-card/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${m.status === "completed" ? "text-status-completed" : "text-muted-foreground"}`} />
                          <span className="font-medium text-foreground">{m.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">${m.amount?.toLocaleString()}</span>
                      </div>
                      {m.due_date && (
                        <p className="mb-3 text-xs text-muted-foreground">Due: {new Date(m.due_date).toLocaleDateString()}</p>
                      )}
                      <div className="flex gap-2">
                        {isClient && m.status !== "completed" && (
                          <>
                            <Button size="sm" variant="hero" onClick={() => approveMilestone(m.id)}>Approve</Button>
                            <Button size="sm" variant="outline">Request Revision</Button>
                          </>
                        )}
                        {isFreelancer && m.status === "pending" && (
                          <Button size="sm" variant="hero" onClick={() => markReady(m.id)}>Mark Ready for Review</Button>
                        )}
                        {m.status === "completed" && (
                          <span className="text-xs text-status-completed font-medium">✓ Released</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Escrow & Info */}
          <div className="space-y-6">
            <div className="glass-card p-5">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Escrow Status</h3>
              <p className="text-2xl font-bold text-foreground">${escrowAmount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {escrowAmount > 0 ? "Funds held in escrow" : "All funds released"}
              </p>
            </div>

            <div className="glass-card p-5 space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Contract Details</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-foreground">${contract.total_amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee</span>
                <span className="text-foreground">${contract.platform_fee?.toLocaleString()}</span>
              </div>
              {contract.deadline && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className="text-foreground">{new Date(contract.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDetail;
