import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PactpayLogo from "@/components/PactpayLogo";
import { useTranslation } from "react-i18next";

const Consent = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

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
        .update({ consent_given: true, consent_date: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      toast.success(t("consent.policiesAccepted"));
      navigate("/kyc" + (redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""));
    } catch (err: any) {
      toast.error(err.message || t("consent.failedSaveConsent"));
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F1B2D] px-4 py-10 selection:bg-primary/30">
      <div className="w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 flex justify-center">
          <PactpayLogo size="lg" />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">{t("consent.title")}</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">{t("consent.subtitle")}</p>
        </div>

        <div className="bg-[#132338] border border-[#1e3a5f] rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/40">
          <div className="space-y-6">
            <label className="flex items-start gap-4 group cursor-pointer">
              <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#00C27C] cursor-pointer" />
              <span className="text-sm leading-relaxed text-slate-300 group-hover:text-white transition-colors">
                {t("consent.agreeTerms")}{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                  className="text-[#00C27C] font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                  {t("consent.termsOfService")}
                </a>
              </span>
            </label>

            <label className="flex items-start gap-4 group cursor-pointer">
              <input type="checkbox" checked={agreedPrivacy} onChange={(e) => setAgreedPrivacy(e.target.checked)}
                className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#00C27C] cursor-pointer" />
              <span className="text-sm leading-relaxed text-slate-300 group-hover:text-white transition-colors">
                {t("consent.agreePrivacy")}{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-[#00C27C] font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                  {t("consent.privacyPolicy")}
                </a>
              </span>
            </label>

            <label className="flex items-start gap-4 group cursor-pointer">
              <input type="checkbox" checked={understoodKYC} onChange={(e) => setUnderstoodKYC(e.target.checked)}
                className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#00C27C] cursor-pointer" />
              <span className="text-sm leading-relaxed text-slate-300 group-hover:text-white transition-colors">
                {t("consent.understandKYC")}
              </span>
            </label>
          </div>

          <div className="mt-10 space-y-6">
            <Button
              className="w-full h-12 bg-[#00C27C] hover:bg-[#00D485] text-[#0F1B2D] font-bold text-base rounded-xl transition-all shadow-lg shadow-[#00C27C]/10 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!allChecked || loading}
              onClick={handleContinue}>
              {loading ? t("common.processing") : t("consent.continueVerification")}
            </Button>
            <div className="text-center">
              <button onClick={handleDecline}
                className="text-sm text-slate-500 hover:text-red-400 transition-colors font-medium underline underline-offset-4">
                {t("consent.declineSignOut")}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-[11px] text-slate-600 leading-relaxed uppercase tracking-widest font-medium">
          {t("consent.securityNote")}
        </p>
      </div>
    </div>
  );
};

export default Consent;
