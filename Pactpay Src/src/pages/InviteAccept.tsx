import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, CheckCircle, XCircle, AlertTriangle, MessageSquarePlus } from "lucide-react";
import { formatDate } from "@/lib/utils";

const InviteAccept = () => {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [kycVerified, setKycVerified] = useState<boolean | null>(null);
  const [kycSubmitted, setKycSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;

    const handleInitialLoad = async () => {
      // 1. Fetch the invite first (always allowed)
      const { data: inv } = await supabase
        .from("contract_invites")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (!inv) {
        toast.error("Invalid invite link");
        navigate("/dashboard");
        return;
      }

      if (inv.accepted) {
        toast.error("This invite has already been accepted");
        navigate("/dashboard");
        return;
      }

      if (new Date(inv.expires_at) < new Date()) {
        toast.error("This invite link has expired");
        navigate("/dashboard");
        return;
      }

      setInvite(inv);

      // 2. If not logged in, check profile and redirect
      if (!authLoading && !user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", inv.invited_email.toLowerCase())
          .maybeSingle();

        const mode = profile ? "signin" : "signup";
        navigate(`/auth?mode=${mode}&email=${inv.invited_email}&redirect=/invite/${token}`);
        return;
      }

      // 3. If logged in, proceed to fetch rest of details
      if (user) {
        fetchContractDetails(inv);
      }
    };

    handleInitialLoad();
  }, [token, user, authLoading]);

  const fetchContractDetails = async (inv: any) => {
    setLoading(true);

    // 2. Fetch the associated contract
    const { data: c } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", inv.contract_id)
      .single();

    if (!c) {
      toast.error("Associated contract not found");
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

    // Check current user's KYC status
    const { data: profile } = await supabase
      .from("profiles")
      .select("kyc_verified, full_name, id_doc_front_url")
      .eq("id", user.id)
      .single();

    setKycVerified(profile?.kyc_verified || false);
    // If id_doc_front_url exists, they've submitted KYC docs
    setKycSubmitted(!!(profile?.id_doc_front_url));

    setLoading(false);
  };


  const acceptContract = async () => {
    if (!user || !contract || !invite) return;

    if (user.email !== invite.invited_email) {
      toast.error("This invite was not sent to your email address (" + user.email + ")");
      return;
    }

    // Double check KYC before accepting
    if (!kycVerified) {
      toast.error("You must complete KYC verification before accepting contracts.");
      return;
    }

    setAccepting(true);

    const { error: cError } = await supabase
      .from("contracts")
      .update({ freelancer_id: user.id, status: "pending" })
      .eq("id", contract.id);

    if (cError) {
      toast.error("Failed to accept (contract update): " + cError.message);
      setAccepting(false);
      return;
    }
    
    const { error: iError } = await supabase
      .from("contract_invites")
      .update({ accepted: true })
      .eq("id", invite.id);

    if (iError) {
      toast.error("Contract accepted but failed to mark invite as accepted: " + iError.message);
    } else {
      toast.success("Contract accepted! The client will now deposit funds to activate it.");
    }

    navigate(`/contracts/${contract.id}`);
    setAccepting(false);
  };

  const declineContract = async () => {
    if (!contract || !user) return;
    
    setAccepting(true); // Re-use accepting state for loading
    
    // 1. Update contract status
    const { error: cError } = await supabase
      .from("contracts")
      .update({ status: "rejected" })
      .eq("id", contract.id);

    if (cError) {
      toast.error("Failed to decline contract: " + cError.message);
      setAccepting(false);
      return;
    }

    // 2. Notify the client
    await supabase.from("notifications").insert({
      user_id: contract.client_id,
      type: "update",
      title: "Contract Invitation Declined",
      message: `${user?.user_metadata?.full_name || user.email} has declined your invitation for "${contract.title}".`,
      link: `/contracts/${contract.id}`
    });

    toast.info("Contract invitation declined.");
    setAccepting(false);
    navigate("/dashboard");
  };


  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );
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
          <p className="text-sm text-muted-foreground">{clientName} wants to work with you on Pactpay</p>
        </div>

        {/* KYC warning banner */}
        {!kycVerified && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-400 mb-1">KYC Verification Required</p>
              {kycSubmitted ? (
                <p className="text-muted-foreground">
                  Your KYC is pending review. You can view the contract details below but cannot accept until your identity is verified by our team.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  You need to complete identity verification before accepting contracts.{" "}
                  <button onClick={() => navigate("/kyc")} className="text-primary underline">
                    Complete KYC now
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

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
            <span className="font-semibold text-primary">${contract.total_amount?.toLocaleString()}</span>
          </div>
          {contract.deadline && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deadline</span>
              <span className="text-foreground">{formatDate(contract.deadline)}</span>
            </div>
          )}

          {milestones.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Milestones ({milestones.length})</p>
              {milestones.map((m: any, i: number) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span className="text-foreground">{m.title || m.name}</span>
                  <span className="text-foreground font-medium">${m.amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 space-y-2">
            {kycVerified === true ? (
              <div className="flex gap-3">
                <Button 
                  variant="hero" 
                  className="flex-1" 
                  onClick={acceptContract} 
                  disabled={accepting}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  {accepting ? "Accepting..." : "Accept Contract"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={declineContract} disabled={accepting}>
                  <XCircle className="mr-1 h-4 w-4" /> Decline
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full border-amber-500/30 text-amber-400 bg-amber-500/5 cursor-not-allowed"
                  disabled={true}
                >
                  <AlertTriangle className="mr-1 h-4 w-4" /> 
                  {kycSubmitted ? "KYC Pending Review" : "KYC Required to Accept"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={declineContract}>
                  <XCircle className="mr-1 h-4 w-4" /> Decline Invitation
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteAccept;