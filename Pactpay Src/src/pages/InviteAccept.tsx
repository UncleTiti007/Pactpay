import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, CheckCircle, XCircle } from "lucide-react";

const InviteAccept = () => {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/invite/${token}`);
      return;
    }
    if (token && user) fetchInvite();
  }, [token, user, authLoading]);

  const fetchInvite = async () => {
    const { data: c } = await supabase
      .from("contracts")
      .select("*")
      .eq("invite_token", token)
      .single();

    if (!c) {
      toast.error("Invalid or expired invite");
      navigate("/dashboard");
      return;
    }

    setContract(c);

    const { data: ms } = await supabase
      .from("milestones")
      .select("*")
      .eq("contract_id", c.id)
      .order("order_index", { ascending: true });
    setMilestones(ms || []);

    if (c.client_id) {
      const { data: cp } = await supabase.from("profiles").select("full_name").eq("id", c.client_id).single();
      setClientName(cp?.full_name || "Unknown");
    }

    setLoading(false);
  };

  const acceptContract = async () => {
    if (!user || !contract) return;
    setAccepting(true);

    const { error } = await supabase
      .from("contracts")
      .update({ freelancer_id: user.id, status: "active" })
      .eq("id", contract.id);

    if (error) {
      toast.error("Failed to accept: " + error.message);
    } else {
      toast.success("Contract accepted!");
      navigate(`/contracts/${contract.id}`);
    }
    setAccepting(false);
  };

  const declineContract = () => {
    toast.info("Contract declined");
    navigate("/dashboard");
  };

  if (loading || authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  if (!contract) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">You've been invited</h1>
          <p className="text-sm text-muted-foreground">{clientName} wants to work with you</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contract</span>
            <span className="font-medium text-foreground">{contract.title}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Client</span>
            <span className="text-foreground">{clientName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="font-semibold text-foreground">${contract.total_amount?.toLocaleString()}</span>
          </div>

          {milestones.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Milestones</p>
              {milestones.map((m: any, i: number) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span className="text-foreground">{m.name}</span>
                  <span className="text-foreground">${m.amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="hero" className="flex-1" onClick={acceptContract} disabled={accepting}>
              <CheckCircle className="mr-1 h-4 w-4" />
              {accepting ? "Accepting..." : "Accept Contract"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={declineContract}>
              <XCircle className="mr-1 h-4 w-4" /> Decline
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteAccept;
