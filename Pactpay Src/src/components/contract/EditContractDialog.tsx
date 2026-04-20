import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Trash2, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

interface Milestone {
  id?: string;
  name: string;
  amount: string;
  percentage: string;
  due_date: string;
  paymentMode: "fixed" | "percentage";
}

interface EditContractDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
  milestones: any[];
  onSuccess: () => void;
}

export function EditContractDialog({ isOpen, onOpenChange, contract, milestones: initialMilestones, onSuccess }: EditContractDialogProps) {
  const [title, setTitle] = useState(contract?.title || "");
  const [description, setDescription] = useState(contract?.description || "");
  const [deadline, setDeadline] = useState(contract?.deadline || "");
  const [totalAmount, setTotalAmount] = useState(contract?.total_amount?.toString() || "");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialMilestones && initialMilestones.length > 0) {
      setMilestones(initialMilestones.map(m => ({
        id: m.id,
        name: m.title || "Untitled Milestone",
        amount: m.amount?.toString() || "0",
        percentage: contract?.total_amount ? ((m.amount / (contract.total_amount * 0.98)) * 100).toFixed(0) : "0",
        due_date: m.due_date || "",
        paymentMode: "fixed"
      })));
    }
  }, [initialMilestones, contract]);

  const contractTotalNum = parseFloat(totalAmount) || 0;
  const platformFee = contractTotalNum * 0.02;
  const netTotalNum = contractTotalNum - platformFee;

  const totalMilestones = milestones.reduce((sum, m) => {
    if (m.paymentMode === "fixed") return sum + (parseFloat(m.amount) || 0);
    return sum + (netTotalNum * (parseFloat(m.percentage) || 0)) / 100;
  }, 0);

  const totalsMatch = Math.abs(totalMilestones - netTotalNum) < 0.01;

  const handleUpdate = async () => {
    if (!totalsMatch) {
      toast.error(`Milestone total ($${totalMilestones.toFixed(2)}) must equal the net budget ($${netTotalNum.toFixed(2)})`);
      return;
    }

    setSaving(true);
    try {
      // 1. Update Contract
      const { error: cError } = await supabase
        .from("contracts")
        .update({
          title,
          description,
          deadline: deadline || null,
          total_amount: contractTotalNum,
          platform_fee: platformFee
        })
        .eq("id", contract.id);

      if (cError) throw cError;

      // 2. Clear old milestones and add new ones (cleanest way for complex revisions)
      await supabase.from("milestones").delete().eq("contract_id", contract.id);
      
      const { error: mError } = await supabase.from("milestones").insert(
        milestones.map((m, i) => ({
          contract_id: contract.id,
          title: m.name,
          amount: m.paymentMode === "fixed" ? parseFloat(m.amount) : (netTotalNum * parseFloat(m.percentage)) / 100,
          due_date: m.due_date || null,
          order_index: i,
          status: "pending"
        }))
      );

      if (mError) throw mError;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase.from("contract_messages").insert({
        contract_id: contract.id,
        sender_id: currentUser?.id,
        content: `Contract details updated by client.`,
        is_system_message: true
      });

      toast.success("Contract updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to update: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, { name: "", amount: "", percentage: "", due_date: "", paymentMode: "fixed" }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    const newMs = [...milestones];
    newMs[index] = { ...newMs[index], [field]: value };
    setMilestones(newMs);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contract Details</DialogTitle>
          <DialogDescription>
            Adjust the terms of your contract before it is accepted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Budget (USD)</Label>
                <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" /> Includes 2% platform fee
                </p>
              </div>
              <div className="space-y-2">
                <Label>Final Deadline</Label>
                <DatePicker 
                  date={deadline ? new Date(deadline) : undefined} 
                  setDate={(d) => setDeadline(d ? d.toISOString().split('T')[0] : "")} 
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold flex items-center justify-between">
              Milestones Allocation
              <Button size="sm" variant="outline" onClick={addMilestone}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </h3>

            {milestones.map((m, i) => (
              <div key={i} className="p-3 border rounded-lg bg-muted/30 space-y-3 relative group">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Input 
                      placeholder="Milestone name" 
                      value={m.name} 
                      onChange={(e) => updateMilestone(i, "name", e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input 
                          type="number" 
                          value={m.amount} 
                          onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                          className="h-8 pl-5 text-sm"
                        />
                      </div>
                      <DatePicker 
                        date={m.due_date ? new Date(m.due_date) : undefined} 
                        setDate={(d) => updateMilestone(i, "due_date", d ? d.toISOString().split('T')[0] : "")}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  {milestones.length > 1 && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMilestone(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg border text-sm font-medium",
              totalsMatch ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20 text-destructive"
            )}>
              <span>Allocated: ${totalMilestones.toFixed(2)}</span>
              <span>Net Budget: ${netTotalNum.toFixed(2)}</span>
            </div>
            {!totalsMatch && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Milestones must sum to exactly 100% of the net budget.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="hero" onClick={handleUpdate} disabled={saving || !totalsMatch}>
            {saving ? "Saving Changes..." : "Save Adjustments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
