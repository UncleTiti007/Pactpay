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
      {/* Custom Tab Switcher */}
      <div className="flex gap-2 p-1 bg-muted/30 rounded-lg border border-border/50">
        <button
          onClick={() => setPaymentMethod('card')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
            paymentMethod === 'card' 
              ? 'bg-background text-foreground shadow-sm border border-border/50' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Credit Card
        </button>
        <button
          onClick={() => setPaymentMethod('google_pay')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
            paymentMethod === 'google_pay' 
              ? 'bg-background text-foreground shadow-sm border border-border/50' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Wallet className="h-4 w-4" />
          Google Pay
        </button>
      </div>

      {paymentMethod === 'card' ? (
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
      ) : (
        <div className="space-y-6 py-4">
          <div className="p-8 rounded-xl border border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Work in Progress</h3>
              <p className="text-sm text-muted-foreground max-w-[250px]">
                Google Pay integration is currently being finalized and will be available shortly.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" variant="hero" disabled>
              Coming Soon
            </Button>
          </div>
        </div>
      )}
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
    console.log("Session token (create):", session?.access_token ? "EXISTS" : "NULL");

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
      console.error("TopUpModal Error (create):", error);
      
      // Try to get more detail from the error
      let detail = error?.message || "Check console for details";
      if (error instanceof Error && (error as any).context) {
        console.error("Error context:", (error as any).context);
      }
      
      toast.error(`Failed to initialize payment: ${detail}`);
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
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
          <DialogDescription>
            {clientSecret ? "Enter your payment details below. Use 4242 4242 4242 4242 for demo." : "Enter the amount you wish to add to your escrow wallet."}
          </DialogDescription>
        </DialogHeader>

        {!clientSecret ? (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleNext();
            }} 
            className="space-y-4 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={resetAndClose}>Cancel</Button>
              <Button type="submit" variant="hero" disabled={isLoading || !amount}>
                {isLoading ? "Starting..." : "Next"}
              </Button>
            </div>
          </form>
        ) : (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret, 
              appearance: { 
                theme: 'night',
                variables: {
                  colorPrimary: '#00d17f',
                  colorBackground: '#111827', // Matching dark theme
                  colorText: '#f8fafc',
                  colorTextSecondary: '#94a3b8',
                  colorDanger: '#ef4444',
                  fontFamily: 'system-ui, sans-serif',
                  spacingUnit: '4px',
                  borderRadius: '8px',
                },
              } 
            }}
          >
            <CheckoutForm clientSecret={clientSecret} onSuccess={handleSuccess} onCancel={resetAndClose} />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TopUpModal;
