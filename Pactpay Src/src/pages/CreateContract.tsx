import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, AlertTriangle, ShieldAlert } from "lucide-react";
import { UserSearch } from "@/components/contract/UserSearch";
import { DatePicker } from "@/components/ui/date-picker";
import { toYMD, formatDate, fromYMD } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type PaymentMode = "fixed" | "percentage";

interface Milestone {
  name: string;
  amount: string;
  due_date: string;
  paymentMode: PaymentMode;
  percentage: string;
}

const CreateContract = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [kycVerified, setKycVerified] = useState<boolean | null>(null);
  const [kycLoading, setKycLoading] = useState(true);

  // Step 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [freelancerEmail, setFreelancerEmail] = useState("");
  const [freelancerId, setFreelancerId] = useState<string | null>(null);
  const [contractTotal, setContractTotal] = useState("");

  // Step 2
  const [milestones, setMilestones] = useState<Milestone[]>([
    { name: "", amount: "", due_date: "", paymentMode: "fixed", percentage: "" },
  ]);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("kyc_verified, consent_given")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data && !data.consent_given) {
        navigate("/consent?redirect=/contracts/new");
        return;
      }
      
      setKycVerified(data?.kyc_verified || false);
      setKycLoading(false);
    };
    checkStatus();
  }, [user, navigate]);

  const getMilestoneAmount = (m: Milestone, netTotal: number): number => {
    if (m.paymentMode === "fixed") return parseFloat(m.amount) || 0;
    const pct = parseFloat(m.percentage) || 0;
    return parseFloat(((pct / 100) * netTotal).toFixed(2));
  };

  const contractTotalNum = parseFloat(contractTotal) || 0;
  const netTotalNum = contractTotalNum * 0.98;
  const platformFee = contractTotalNum * 0.02;
  const totalMilestones = milestones.reduce((sum, m) => sum + getMilestoneAmount(m, netTotalNum), 0);
  const totalsMatch = contractTotalNum === 0 || Math.abs(totalMilestones - netTotalNum) < 0.01;

  const addMilestone = () => {
    setMilestones([...milestones, { name: "", amount: "", due_date: "", paymentMode: "fixed", percentage: "" }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);

    const { data: contract, error } = await supabase
      .from("contracts")
      .insert({
        title,
        description,
        deadline: deadline || null,
        client_id: user.id,
        total_amount: contractTotalNum,
        platform_fee: platformFee,
        status: "pending",
        invite_email: freelancerEmail.toLowerCase(),
        freelancer_id: freelancerId,
      })
      .select()
      .single();

    if (error) {
      toast.error(t("createContract.error.failed") + ": " + error.message);
      setSaving(false);
      return;
    }

    const milestoneData = milestones.map((m, i) => ({
      contract_id: contract.id,
      title: m.name,
      amount: getMilestoneAmount(m, netTotalNum),
      due_date: m.due_date || null,
      status: "pending",
      order_index: i,
    }));

    const { error: mError } = await supabase.from("milestones").insert(milestoneData);
    const { data: invite, error: inviteError } = await supabase
      .from("contract_invites")
      .insert({
        contract_id: contract.id,
        invited_email: freelancerEmail,
      })
      .select()
      .single();

    if (mError || inviteError) {
      toast.error(t("createContract.error.partial") + ": " + (mError?.message || inviteError?.message));
    } else {
      toast.success(t("createContract.success"));
      
      if (freelancerId) {
        await supabase.from("notifications").insert({
          user_id: freelancerId,
          type: "invite",
          title: "contract.notif.newInviteTitle",
          message: "contract.notif.newInviteMsg",
          metadata: { title },
          link: `/contracts/${contract.id}`
        });
      }

      try {
        await supabase.functions.invoke("send-email", {
          body: { type: "invite", contract_id: contract.id, invite_id: invite.id }
        });
      } catch (err) {
        console.error("Error triggering invite email:", err);
      }
    }

    navigate(`/contracts/${contract.id}`);
    setSaving(false);
  };

  const isSelfAssign = freelancerEmail.toLowerCase() === user?.email?.toLowerCase() || freelancerId === user?.id;
  const canProceedStep1 = title && freelancerEmail && !isSelfAssign;
  const canProceedStep2 = milestones.every((m) => {
    const hasName = m.name.trim() !== "";
    const hasAmount =
      m.paymentMode === "fixed"
        ? parseFloat(m.amount) > 0
        : parseFloat(m.percentage) > 0;
    return hasName && hasAmount;
  });

  if (kycLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto max-w-2xl px-4 py-6 md:py-12">
        <div className="mb-6 md:mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 md:h-10 md:w-10 hover:bg-muted" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight m-0">{t("createContract.title")}</h1>
        </div>

        {!kycVerified && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-4">
            <ShieldAlert className="h-10 w-10 text-amber-400 mx-auto" />
            <h2 className="text-lg font-semibold text-amber-400">{t("createContract.kycRequiredTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("createContract.kycRequiredMsg")}
            </p>
            <Button variant="outline" onClick={() => navigate("/profile")}>
              {t("createContract.viewKycStatus")}
            </Button>
          </div>
        )}

        {kycVerified && (
          <>
            <div className="mb-8 flex items-center justify-center w-full max-w-md mx-auto">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`flex items-center ${s < 3 ? "flex-1" : ""}`}>
                  <div
                    className={`flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${s <= step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border border-border text-muted-foreground"
                      }`}
                  >
                    {s < step ? <Check className="h-4 w-4 md:h-5 md:w-5" /> : s}
                  </div>
                  {s < 3 && <div className={`h-1 flex-1 mx-2 sm:mx-4 rounded-full ${s < step ? "bg-primary" : "bg-border/50"}`} />}
                </div>
              ))}
            </div>

            {step === 1 && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canProceedStep1) setStep(2);
                }}
                className="glass-card space-y-5 p-5 md:p-8"
              >
                <h2 className="text-lg font-semibold text-foreground">{t("createContract.step1Title")}</h2>
                <div>
                  <Label htmlFor="title">{t("createContract.labelTitle")} <span className="text-destructive">*</span></Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("createContract.placeholderTitle")} required autoFocus />
                </div>
                <div>
                  <Label htmlFor="description">{t("createContract.labelScope")} <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("createContract.placeholderScope")}
                    rows={5}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contractTotal">{t("createContract.labelTotal")} <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="contractTotal"
                      type="number"
                      className="pl-7"
                      value={contractTotal}
                      onChange={(e) => setContractTotal(e.target.value)}
                      placeholder="5000"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t("createContract.totalDesc")}</p>
                </div>
                <div>
                  <Label htmlFor="deadline">{t("createContract.labelDeadline")}</Label>
                  <DatePicker
                    date={fromYMD(deadline)}
                    setDate={(date) => setDeadline(toYMD(date))}
                    placeholder={t("createContract.placeholderDeadline")}
                    className="mt-1"
                    calendarProps={{
                      fromYear: new Date().getFullYear(),
                      toYear: new Date().getFullYear() + 2,
                      disabled: { before: new Date() }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="freelancerEmail">{t("createContract.labelFreelancer")} <span className="text-destructive">*</span></Label>
                  <UserSearch
                    excludeUserId={user?.id}
                    onSelect={(selectedUser) => {
                      if (selectedUser) {
                        setFreelancerEmail(selectedUser.email);
                        setFreelancerId(selectedUser.id);
                      } else {
                        setFreelancerId(null);
                      }
                    }}
                    onEmailChange={(email) => {
                      setFreelancerEmail(email);
                      setFreelancerId(null);
                    }}
                    defaultValue={freelancerEmail}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{t("createContract.freelancerDesc")}</p>
                  {(freelancerEmail.toLowerCase() === user?.email?.toLowerCase() || freelancerId === user?.id) && (
                    <p className="mt-2 text-sm text-destructive font-medium flex items-center gap-1.5 animate-in shake duration-300">
                      <AlertTriangle className="h-4 w-4" />
                      {t("contract.detail.error.selfAssign")}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="hero" disabled={!canProceedStep1}>
                    {t("common.next")} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canProceedStep2 && totalsMatch) setStep(3);
                }}
                className="glass-card space-y-6 p-5 md:p-8"
              >
                <h2 className="text-lg font-semibold text-foreground">{t("createContract.step2Title")}</h2>

                {milestones.map((m, i) => {
                  const dollarAmount = getMilestoneAmount(m, netTotalNum);
                  const dateExceedsDeadline = deadline && m.due_date && m.due_date > deadline;
                  return (
                    <div key={i} className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">{t("createContract.milestoneLabel", { num: i + 1 })}</span>
                        {milestones.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMilestone(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <Input
                        value={m.name}
                        onChange={(e) => updateMilestone(i, "name", e.target.value)}
                        placeholder={t("createContract.milestoneNamePlaceholder")}
                      />

                      <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                        <button
                          type="button"
                          className={`flex-1 py-1.5 px-3 transition-colors ${m.paymentMode === "fixed" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                          onClick={() => updateMilestone(i, "paymentMode", "fixed")}
                        >
                          {t("createContract.fixedAmount")}
                        </button>
                        <button
                          type="button"
                          className={`flex-1 py-1.5 px-3 transition-colors ${m.paymentMode === "percentage" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                          onClick={() => updateMilestone(i, "paymentMode", "percentage")}
                        >
                          {t("createContract.percentageOfTotal")}
                        </button>
                      </div>

                      <div className="flex flex-row gap-3 sm:gap-4 items-center">
                        {m.paymentMode === "fixed" ? (
                          <div className="w-1/3 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input
                              type="number"
                              className="pl-7 h-11 sm:h-9"
                              value={m.amount}
                              onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                              placeholder={t("createContract.amountPlaceholder")}
                            />
                          </div>
                        ) : (
                          <div className="w-1/3 relative">
                            <Input
                              type="number"
                              className="h-11 sm:h-9"
                              value={m.percentage}
                              onChange={(e) => updateMilestone(i, "percentage", e.target.value)}
                              placeholder={t("createContract.percentagePlaceholder")}
                              max={100}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                            {m.percentage && (
                              <p className="text-[10px] sm:text-xs text-primary font-medium absolute mt-0.5 whitespace-nowrap">= ${dollarAmount.toLocaleString()}</p>
                            )}
                          </div>
                        )}

                        <div className="flex-1 flex flex-row items-center gap-2 sm:gap-3">
                          <Label className="text-xs sm:text-sm font-medium whitespace-nowrap m-0">{t("createContract.labelMilestoneDueDate")}</Label>
                          <DatePicker
                            date={fromYMD(m.due_date)}
                            setDate={(date) => {
                              const dateStr = toYMD(date);
                              if (deadline && dateStr > deadline) {
                                toast.error(t("createContract.error.milestoneExceedsDeadline", { deadline: formatDate(deadline) }));
                                return;
                              }
                              updateMilestone(i, "due_date", dateStr);
                            }}
                            placeholder={t("createContract.placeholderDueDate")}
                            className="h-11 sm:h-9 text-sm w-full"
                            calendarProps={{
                              fromYear: new Date().getFullYear(),
                              toYear: new Date().getFullYear() + 2,
                              disabled: { before: new Date() }
                            }}
                          />
                        </div>
                      </div>
                      {dateExceedsDeadline && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {t("createContract.error.exceedsDeadline")}
                        </p>
                      )}
                    </div>
                  );
                })}

                <Button variant="outline" className="w-full" onClick={addMilestone}>
                  <Plus className="mr-1 h-4 w-4" /> {t("createContract.addMilestone")}
                </Button>

                <div className={`rounded-lg p-4 space-y-2 border ${totalsMatch ? "border-border bg-card/30" : "border-destructive/50 bg-destructive/5"}`}>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("createContract.milestonesSum")}</span>
                    <span className="font-semibold text-foreground">${totalMilestones.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {contractTotalNum > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("createContract.milestoneBudget")}</span>
                      <span className="font-semibold text-foreground">${netTotalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {!totalsMatch && contractTotalNum > 0 && (
                    <div className="flex items-center gap-2 pt-1 text-sm text-destructive font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {t("createContract.error.sumMismatch", { budget: netTotalNum.toFixed(2) })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-border/50">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)} className="h-11 sm:h-10">
                    <ArrowLeft className="mr-1 h-4 w-4" /> {t("common.back")}
                  </Button>
                  <Button type="submit" variant="hero" disabled={!canProceedStep2 || !totalsMatch} className="h-11 sm:h-10">
                    {t("createContract.previewBtn")} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div className="glass-card space-y-5 p-6">
                <h2 className="text-lg font-semibold text-foreground">{t("createContract.step3Title")}</h2>

                <div className="space-y-3 rounded-lg border border-border bg-card/50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("createContract.labelReviewTitle")}</span>
                    <span className="text-foreground font-medium">{title}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("createContract.labelReviewFreelancer")}</span>
                    <span className="text-foreground">{freelancerEmail}</span>
                  </div>
                  {deadline && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("createContract.labelReviewDeadline")}</span>
                      <span className="text-foreground">{formatDate(deadline)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3">
                    <p className="mb-2 text-sm font-medium text-muted-foreground">{t("createContract.labelReviewMilestones")}</p>
                    {milestones.map((m, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-foreground">{m.name}</span>
                      <span className="text-foreground">${getMilestoneAmount(m, netTotalNum).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("createContract.reviewMilestonesTotal")}</span>
                    <span className="text-foreground">${totalMilestones.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("createContract.reviewPlatformFee")}</span>
                    <span className="text-foreground">${platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border/50">
                    <span className="text-foreground">{t("createContract.reviewTotalDeposit")}</span>
                    <span className="text-primary">${contractTotalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> {t("common.back")}
                  </Button>
                  <Button variant="hero" onClick={handleSubmit} disabled={saving}>
                    {saving ? t("common.sending") : t("createContract.sendBtn")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CreateContract;