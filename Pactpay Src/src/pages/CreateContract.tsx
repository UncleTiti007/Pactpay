import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check } from "lucide-react";

interface Milestone {
  name: string;
  amount: string;
  due_date: string;
}

const CreateContract = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [freelancerEmail, setFreelancerEmail] = useState("");

  // Step 2
  const [milestones, setMilestones] = useState<Milestone[]>([
    { name: "", amount: "", due_date: "" },
  ]);

  const totalAmount = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  const platformFee = totalAmount * 0.05;

  const addMilestone = () => {
    setMilestones([...milestones, { name: "", amount: "", due_date: "" }]);
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

    const inviteToken = crypto.randomUUID();

    const { data: contract, error } = await supabase
      .from("contracts")
      .insert({
        title,
        description,
        deadline: deadline || null,
        client_id: user.id,
        freelancer_email: freelancerEmail,
        total_amount: totalAmount,
        platform_fee: platformFee,
        status: "pending",
        invite_token: inviteToken,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create contract: " + error.message);
      setSaving(false);
      return;
    }

    // Create milestones
    const milestoneData = milestones.map((m, i) => ({
      contract_id: contract.id,
      name: m.name,
      amount: parseFloat(m.amount),
      due_date: m.due_date || null,
      status: "pending",
      order_index: i,
    }));

    const { error: mError } = await supabase.from("milestones").insert(milestoneData);

    if (mError) {
      toast.error("Contract created but failed to add milestones");
    } else {
      toast.success("Contract created successfully!");
    }

    navigate(`/contracts/${contract.id}`);
    setSaving(false);
  };

  const canProceedStep1 = title && freelancerEmail;
  const canProceedStep2 = milestones.every((m) => m.name && m.amount);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-foreground">Create a Contract</h1>

        {/* Progress bar */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  s <= step ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`h-px flex-1 ${s < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="glass-card space-y-5 p-6">
            <h2 className="text-lg font-semibold text-foreground">Contract Basics</h2>
            <div>
              <Label htmlFor="title">Contract title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Website Redesign" />
            </div>
            <div>
              <Label htmlFor="description">Scope of work</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the project..." rows={4} />
            </div>
            <div>
              <Label htmlFor="deadline">Overall deadline</Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="freelancerEmail">Freelancer's email</Label>
              <Input id="freelancerEmail" type="email" value={freelancerEmail} onChange={(e) => setFreelancerEmail(e.target.value)} placeholder="freelancer@example.com" />
            </div>
            <div className="flex justify-end">
              <Button variant="hero" onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="glass-card space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Milestones</h2>
              <span className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">${totalAmount.toLocaleString()}</span>
              </span>
            </div>

            {milestones.map((m, i) => (
              <div key={i} className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Milestone {i + 1}</span>
                  {milestones.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMilestone(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input value={m.name} onChange={(e) => updateMilestone(i, "name", e.target.value)} placeholder="Milestone name" />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" value={m.amount} onChange={(e) => updateMilestone(i, "amount", e.target.value)} placeholder="Amount (USD)" />
                  <Input type="date" value={m.due_date} onChange={(e) => updateMilestone(i, "due_date", e.target.value)} />
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={addMilestone}>
              <Plus className="mr-1 h-4 w-4" /> Add milestone
            </Button>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button variant="hero" onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="glass-card space-y-5 p-6">
            <h2 className="text-lg font-semibold text-foreground">Review & Send</h2>

            <div className="space-y-3 rounded-lg border border-border bg-card/50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Title</span>
                <span className="text-foreground font-medium">{title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Freelancer</span>
                <span className="text-foreground">{freelancerEmail}</span>
              </div>
              {deadline && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className="text-foreground">{new Date(deadline).toLocaleDateString()}</span>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Milestones</p>
                {milestones.map((m, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-foreground">{m.name}</span>
                    <span className="text-foreground">${parseFloat(m.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">${totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform fee (5%)</span>
                  <span className="text-foreground">${platformFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">${(totalAmount + platformFee).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button variant="hero" onClick={handleSubmit} disabled={saving}>
                {saving ? "Sending..." : "Send Contract"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateContract;
