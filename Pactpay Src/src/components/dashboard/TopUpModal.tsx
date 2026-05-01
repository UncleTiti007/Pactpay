import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { stripePromise } from "@/lib/stripe";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Wallet, AlertCircle } from "lucide-react";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutForm = ({ clientSecret, onSuccess, onCancel }: { clientSecret: string, onSuccess: () => void, onCancel: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'google_pay'>('card');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (error) {
      toast.error(error.message || "Payment failed");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Call edge function to confirm and update wallet
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please log in again to complete the payment");
        setIsProcessing(false);
        return;
      }

      const { error: confirmError } = await supabase.functions.invoke('topup-wallet', {
        body: { action: 'confirm', payment_intent_id: paymentIntent.id },
        headers: { 
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        }
      });
      
      if (confirmError) {
        toast.error("Payment succeeded but wallet update failed! Please contact support.");
      } else {
        toast.success("Wallet topped up successfully!");
        onSuccess();
      }
      setIsProcessing(false);
    }
  };

  const cardStyle = {
    style: {
      base: {
        color: "#f8fafc",
        fontFamily: 'system-ui, sans-serif',
        fontSmoothing: "antialiased",
        fontSize: "16px",
        "::placeholder": {
          color: "#94a3b8"
        },
        iconColor: "#00d17f",
      },
      invalid: {
        color: "#ef4444",
        iconColor: "#ef4444"
      }
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-lg border border-border/50 bg-background shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <CardElement options={cardStyle} />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button type="submit" variant="hero" disabled={!stripe || isProcessing}>
            {isProcessing ? "Processing..." : "Confirm Payment"}
          </Button>
        </div>
      </form>
    </div>
  );
};

const TopUpModal = ({ isOpen, onClose, onSuccess }: TopUpModalProps) => {
  const [amount, setAmount] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      toast.error("Please log in again");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke('topup-wallet', {
      body: { action: 'create', amount: numAmount },
      headers: { 
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (error || !data?.clientSecret) {
      toast.error(`Failed to initialize payment: ${error?.message || "Check console"}`);
      setIsLoading(false);
      return;
    }

    setClientSecret(data.clientSecret);
    setIsLoading(false);
  };

  const resetAndClose = () => {
    setAmount("");
    setClientSecret(null);
    onClose();
  };

  const handleSuccess = () => {
    resetAndClose();
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border/50">
        <div className="p-6 pb-4">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Top Up Wallet</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1.5">
              {clientSecret 
                ? "Enter your payment details below to fund your escrow wallet." 
                : "Enter the amount you wish to add to your escrow wallet. Funds are held securely until you release them."}
            </DialogDescription>
          </DialogHeader>

          {!clientSecret ? (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleNext();
              }} 
              className="space-y-6 pt-2"
            >
              <div className="space-y-3">
                <Label htmlFor="amount" className="text-sm font-medium">Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1,000"
                    className="pl-8 h-12 bg-muted/20 border-border/50 text-lg font-semibold focus:ring-primary/20"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic">Use 4242 4242 4242 4242 for demo testing.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="button" variant="outline" onClick={resetAndClose} className="flex-1 h-11 border-border/50">
                  Cancel
                </Button>
                <Button type="submit" variant="hero" disabled={isLoading || !amount} className="flex-1 h-11">
                  {isLoading ? "Processing..." : "Continue to Payment"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="pt-2">
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret, 
                  appearance: { 
                    theme: 'night',
                    variables: {
                      colorPrimary: '#00d17f',
                      colorBackground: '#0F172A',
                      colorText: '#f8fafc',
                      colorTextSecondary: '#94a3b8',
                      colorDanger: '#ef4444',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      spacingUnit: '4px',
                      borderRadius: '12px',
                    },
                  } 
                }}
              >
                <CheckoutForm clientSecret={clientSecret} onSuccess={handleSuccess} onCancel={resetAndClose} />
              </Elements>
            </div>
          )}
        </div>
        
        <div className="bg-muted/30 p-4 flex items-center justify-center gap-2 border-t border-border/30">
          <Wallet className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Secure Escrow Payment</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpModal;
