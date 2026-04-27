import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import PactpayLogo from "@/components/PactpayLogo";
import { ArrowLeft } from "lucide-react";

const Consent = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [understoodKYC, setUnderstoodKYC] = useState(false);

  const allChecked = agreedTerms && agreedPrivacy && understoodKYC;
  const redirectPath = searchParams.get("redirect");

  const handleContinue = async () => {
    if (!user || !allChecked) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          consent_given: true,
          consent_date: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Policies accepted!");
      navigate("/kyc" + (redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""));
    } catch (err: any) {
      toast.error(err.message || "Failed to save consent");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <PactpayLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Before you continue</h1>
          <p className="text-sm text-muted-foreground mt-2 px-4">
            To use Pactpay you need to verify your identity. Before we collect your information, please review and agree to our policies.
          </p>
        </div>

        <div className="glass-card p-8 relative border-primary/20">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-6 top-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors group"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="space-y-6">
            <div className="flex items-start space-x-3 group cursor-pointer" onClick={() => setAgreedTerms(!agreedTerms)}>
              <Checkbox 
                id="terms" 
                checked={agreedTerms} 
                onCheckedChange={(checked) => setAgreedTerms(checked as boolean)}
                className="mt-1 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label 
                htmlFor="terms" 
                className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                I agree to the{" "}
                <a 
                  href="/terms" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  Terms of Service
                </a>
              </label>
            </div>

            <div className="flex items-start space-x-3 group cursor-pointer" onClick={() => setAgreedPrivacy(!agreedPrivacy)}>
              <Checkbox 
                id="privacy" 
                checked={agreedPrivacy} 
                onCheckedChange={(checked) => setAgreedPrivacy(checked as boolean)}
                className="mt-1 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label 
                htmlFor="privacy" 
                className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                I agree to the{" "}
                <a 
                  href="/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  Privacy Policy
                </a>
              </label>
            </div>

            <div className="flex items-start space-x-3 group cursor-pointer" onClick={() => setUnderstoodKYC(!understoodKYC)}>
              <Checkbox 
                id="kyc-consent" 
                checked={understoodKYC} 
                onCheckedChange={(checked) => setUnderstoodKYC(checked as boolean)}
                className="mt-1 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label 
                htmlFor="kyc-consent" 
                className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
              >
                I understand that my ID documents will be securely stored and reviewed only by authorised Pactpay staff for verification purposes
              </label>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <Button 
              variant="hero" 
              className="w-full h-12 shadow-lg shadow-primary/20"
              disabled={!allChecked || loading}
              onClick={handleContinue}
            >
              {loading ? "Processing..." : "Continue to Verification"}
            </Button>
            
            <button 
              onClick={handleDecline}
              className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors py-2 font-medium"
            >
              Decline & Sign Out
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Your security and privacy are our top priority. <br />
          All data is encrypted and handled according to international standards.
        </p>
      </div>
    </div>
  );
};

export default Consent;
