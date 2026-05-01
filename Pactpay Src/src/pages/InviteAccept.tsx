import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const InviteAccept = () => {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      const { data: inv } = await supabase.from("contract_invites").select("*").eq("token", token).maybeSingle();
      if (!inv) { toast.error(t("invite.invalidLink")); navigate("/dashboard"); return; }
      if (inv.accepted) { toast.error(t("invite.alreadyAccepted")); navigate("/dashboard"); return; }
      if (new Date(inv.expires_at) < new Date()) { toast.error(t("invite.expired")); navigate("/dashboard"); return; }
      setInvite(inv);
      if (!authLoading && !user) {
        const { data: profile } = await supabase.from("profiles").select("id").eq("email", inv.invited_email.toLowerCase()).maybeSingle();
        const mode = profile ? "signin" : "signup";
        navigate(`/auth?mode=${mode}&email=${inv.invited_email}&redirect=/invite/${token}`);
        return;
      }
      if (user) fetchContractDetails(inv);
    };
    handleInitialLoad();
  }, [token, user, authLoading]);

  const fetchContractDetails = async (inv: any) => {
    setLoading(true);
    const { data: c } = await supabase.from("contracts").select("*").eq("id", inv.contract_id).single();
    if (!c) { toast.error(t("invite.contractNotFound")); navigate("/dashboard"); return; }
    setContract(c);
    const { data: ms } = await supabase.from("milestones").select("*").eq("contract_id", c.id).order("order_index", { ascending: true });
    setMilestones(ms || []);
    if (c.client_id) {
      const { data: cp } = await supabase.from("profiles").select("full_name").eq("id", c.client_id).single();
      setClientName(cp?.full_name || t("common.unknown"));
    }
    const { data: profile } = await supabase.from("profiles").select("kyc_verified, full_name, id_doc_front_url").eq("id", user!.id).single();
    setKycVerified(profile?.kyc_verified || false);
    setKycSubmitted(!!(profile?.id_doc_front_url));
    setLoading(false);
  };

  const acceptContract = async () => {
    if (!user || !contract || !invite) return;
    if (user.email !== invite.invited_email) { toast.error(t("invite.wrongEmail", { email: user.email })); return; }
    if (!kycVerified) { toast.error(t("invite.kycRequired")); return; }
    setAccepting(true);
    const { error: cError } = await supabase.from("contracts").update({ freelancer_id: user.id, status: "pending" }).eq("id", contract.id);
    if (cError) { toast.error(t("invite.acceptFailed") + ": " + cError.message); setAccepting(false); return; }
    const { error: iError } = await supabase.from("contract_invites").update({ accepted: true }).eq("id", invite.id);
    if (iError) { toast.error(t("invite.partialAcceptError") + ": " + iError.message); }
    else { toast.success(t("invite.acceptedSuccess")); }
    navigate(`/contracts/${contract.id}`);
    setAccepting(false);
  };

  const declineContract = async () => {
    if (!contract || !user) return;
    setAccepting(true);
    const { error: cError } = await supabase.from("contracts").update({ status: "rejected" }).eq("id", contract.id);
    if (cError) { toast.error(t("invite.declineFailed") + ": " + cError.message); setAccepting(false); return; }
    await supabase.from("notifications").insert({
      user_id: contract.client_id, type: "update",
      title: t("invite.declinedNotifTitle"),
      message: `${user?.user_metadata?.full_name || user.email} ${t("invite.declinedNotifMsg")} "${contract.title}".`,
      link: `/contracts/${contract.id}`
    });
    toast.info(t("invite.declinedInfo"));
    setAccepting(false);
    navigate("/dashboard");
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        {t("invite.loading")}
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
          <h1 className="text-2xl font-bold text-foreground">{t("invite.title")}</h1>
          <p className="text-sm text-muted-foreground">{clientName} {t("invite.wantsToWorkWith")}</p>
        </div>

        {!kycVerified && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-400 mb-1">{t("invite.kycRequiredTitle")}</p>
              {kycSubmitted ? (
                <p className="text-muted-foreground">{t("invite.kycPendingMsg")}</p>
              ) : (
                <p className="text-muted-foreground">
                  {t("invite.kycRequiredMsg")}{" "}
                  <button onClick={() => navigate("/kyc")} className="text-primary underline">{t("invite.completeKYCNow")}</button>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("invite.contractLabel")}</span>
            <span className="font-medium text-foreground">{contract.title}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("invite.clientLabel")}</span>
            <span className="text-foreground">{clientName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("invite.totalAmount")}</span>
            <span className="font-semibold text-primary">${contract.total_amount?.toLocaleString()}</span>
          </div>
          {contract.deadline && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("invite.deadline")}</span>
              <span className="text-foreground">{formatDate(contract.deadline)}</span>
            </div>
          )}

          {milestones.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium text-muted-foreground">{t("invite.milestonesLabel")} ({milestones.length})</p>
              {milestones.map((m: any, i: number) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span className="text-foreground">{m.title || m.name}</span>
                  <span className="text-foreground font-medium">${m.amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 space-y-2">
            {kycVerified === true ? (
              <div className="flex gap-3">
                <Button variant="hero" className="flex-1" onClick={acceptContract} disabled={accepting}>
                  <CheckCircle className="mr-1 h-4 w-4" />
                  {accepting ? t("common.processing") : t("invite.accept")}
                </Button>
                <Button variant="outline" className="flex-1" onClick={declineContract} disabled={accepting}>
                  <XCircle className="mr-1 h-4 w-4" /> {t("invite.decline")}
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" className="w-full border-amber-500/30 text-amber-400 bg-amber-500/5 cursor-not-allowed" disabled>
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  {kycSubmitted ? t("invite.kycPendingBtn") : t("invite.kycRequiredBtn")}
                </Button>
                <Button variant="ghost" className="w-full" onClick={declineContract}>
                  <XCircle className="mr-1 h-4 w-4" /> {t("invite.declineInvitation")}
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