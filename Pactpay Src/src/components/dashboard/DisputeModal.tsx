import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function DisputeModal({ isOpen, onClose, milestone, contractId, onSuccess }: any) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !user || !milestone) return;
    setLoading(true);

    try {
      // 1. Insert dispute
      const { data: dispute, error: disputeErr } = await supabase
        .from("disputes")
        .insert({
          contract_id: contractId,
          milestone_id: milestone.id,
          raised_by: user.id,
          reason,
          status: "open"
        })
        .select()
        .single();
      
      if (disputeErr) throw disputeErr;

      // 2. Upload evidence to generic bucket
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${dispute.id}/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("evidence").upload(filePath, file);
        
        if (!uploadError) {
          const { data: publicUrl } = supabase.storage.from("evidence").getPublicUrl(filePath);
          await supabase.from("dispute_evidence").insert({
            dispute_id: dispute.id,
            file_url: publicUrl.publicUrl,
            uploaded_by: user.id
          });
        }
      }

      // 3. Freeze Contract & Milestone
      await supabase.from("contracts").update({ status: "disputed" }).eq("id", contractId);
      await supabase.from("milestones").update({ status: "disputed" }).eq("id", milestone.id);

      // 4. Notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "system",
        message: `Dispute raised for milestone: ${milestone.name}. Admin review pending.`
      });

      toast.success("Dispute raised. Staff will review shortly.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to raise dispute");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise a Dispute</DialogTitle>
          <DialogDescription>
            If you're unable to resolve this with the other party, explain the issue below and upload any evidence. Escrow funds will be frozen until an Admin resolves it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea 
              placeholder="Explain the issue in detail..." 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Evidence (Optional)</Label>
            <Input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={loading || !reason}>
              {loading ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
