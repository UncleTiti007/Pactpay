import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Building, Banknote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
  kycVerified: boolean;
  userId: string;
  bankDetails: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
  onSuccess: () => void;
}

const WithdrawModal = ({ isOpen, onClose, walletBalance, kycVerified, userId, bankDetails, onSuccess }: WithdrawModalProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Validate that bank details actually exist
  const hasBankDetails = !!(bankDetails.bankName && bankDetails.accountNumber);

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const numAmount = Number(amount);

    if (numAmount > walletBalance) {
      toast.error("Insufficient funds in your wallet");
      return;
    }

    if (!hasBankDetails) {
      toast.error("Please add your bank details in your profile first");
      return;
    }

    setLoading(true);

    try {
      // Call the atomic database function with string arguments for better type matching
      const { data, error: rpcError } = await supabase.rpc('process_withdrawal', {
        p_user_id: userId,
        p_amount: numAmount.toString(),
        p_bank_name: bankDetails.bankName,
        p_account_name: bankDetails.accountName,
        p_account_number: bankDetails.accountNumber
      });

      if (rpcError) throw rpcError;
      
      // The RPC returns {success: boolean, message?: string}
      const result = data as { success: boolean; message?: string };
      if (!result.success) {
        throw new Error(result.message || "Failed to process withdrawal");
      }

      toast.success("Withdrawal request submitted successfully");
      onSuccess();
      onClose();
      setAmount("");
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.error(error.message || "Failed to process withdrawal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Banknote className="h-5 w-5 text-primary" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Transfer funds from your Pactpay wallet to your bank account.
          </DialogDescription>
        </DialogHeader>

        {!kycVerified ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500 flex items-start gap-3 mt-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>Your account must be KYC verified before you can withdraw funds. Please complete verification in your profile.</p>
          </div>
        ) : !hasBankDetails ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500 flex items-start gap-3 mt-2">
            <Building className="h-5 w-5 shrink-0 mt-0.5" />
            <p>No valid bank account found. Please update your bank details in your profile before withdrawing.</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="rounded-lg bg-card-elevated p-4 border border-border/50 flex flex-col items-center justify-center space-y-1">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <span className="text-3xl font-bold text-foreground">
                ${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-3">
              <Label htmlFor="amount">Withdrawal Amount ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-7 input-glass"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={walletBalance}
                  min={1}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Building className="h-4 w-4" />
                <span className="font-medium">Destination Bank Account</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-muted-foreground">Bank:</div>
                <div className="font-medium text-foreground text-right">{bankDetails.bankName}</div>
                <div className="text-muted-foreground">Account:</div>
                <div className="font-medium text-foreground text-right">{bankDetails.accountName}</div>
                <div className="text-muted-foreground">Number:</div>
                <div className="font-medium text-foreground text-right">••••{bankDetails.accountNumber?.slice(-4) || '****'}</div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="hero" 
            onClick={handleWithdraw} 
            disabled={!kycVerified || !hasBankDetails || loading || !amount || Number(amount) <= 0 || Number(amount) > walletBalance}
          >
            {loading ? "Processing..." : "Confirm Withdrawal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawModal;
