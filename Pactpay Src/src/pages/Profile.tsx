import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User as UserIcon, Pencil, ShieldCheck, Mail, Phone, Globe, Calendar, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
    else navigate("/auth");
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles").select("*").eq("id", user!.id).maybeSingle();

    if (error) {
      setErrorStatus(t("profile.couldNotLoadProfile"));
      setLoading(false);
      return;
    }

    if (!data) {
      setProfile({ id: user!.id, email: user!.email, full_name: user?.user_metadata?.full_name || "", kyc_verified: false, wallet_balance: 0, account_type: "individual" });
    } else {
      setProfile(data);
      if (data.avatar_url) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_url);
        setAvatarUrl(urlData?.publicUrl || null);
      }
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (event: any) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: filePath }).eq('id', user!.id);
      if (updateError) throw updateError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(urlData?.publicUrl || null);
      toast.success(t("profile.avatarUpdated"));
    } catch (error: any) {
      toast.error(error.message || t("profile.errorUploadingAvatar"));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="flex min-h-[80vh] items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span>{t("profile.loadingProfile")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (errorStatus && !profile) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <DashboardNavbar />
        <div className="container mx-auto max-w-lg px-4 py-20">
          <div className="glass-card overflow-hidden">
            <div className="h-2 bg-primary/20" />
            <div className="p-10 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <UserIcon className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">{t("profile.profileNotSetup")}</h1>
                <p className="text-muted-foreground leading-relaxed">{errorStatus}</p>
              </div>
              <Button variant="hero" onClick={() => navigate("/kyc")} className="w-full h-12 text-base shadow-lg shadow-primary/20">
                {t("profile.completeKYCNow")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const kycVerified = profile?.kyc_verified === true;
  const accountType = profile?.account_type || "individual";

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) => (
    <div className="group flex items-center justify-between py-3 border-b border-border/40 last:border-0 transition-colors hover:bg-white/5 px-2 -mx-2 rounded-lg">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary/70 transition-colors" />}
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <span className="text-sm text-foreground font-semibold">{value || "—"}</span>
    </div>
  );

  const idTypeLabel = profile?.id_type === "national_id" ? t("profile.nationalId") : profile?.id_type === "passport" ? t("profile.passport") : t("profile.driversLicense");

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit group">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          {t("profile.backToDashboard")}
        </button>

        <div className="glass-card p-6 flex items-center gap-5">
          <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-border transition-opacity group-hover:opacity-75" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-2 ring-border transition-colors group-hover:bg-primary/20">
                <UserIcon className="h-9 w-9 text-primary" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/40 rounded-full p-2 backdrop-blur-sm">
                {uploading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Pencil className="h-5 w-5 text-white" />}
              </div>
            </div>
            <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{profile?.full_name || "Anonymous"}</h1>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {kycVerified ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> {t("profile.verified")}
                </Badge>
              ) : profile?.id_doc_front_url ? (
                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {t("profile.pendingReview")}
                </Badge>
              ) : (
                <Badge className="bg-primary/10 text-primary border-primary/30 px-2.5 py-0.5 rounded-full">
                  {t("profile.actionRequired")}
                </Badge>
              )}
              <Badge variant="outline" className="capitalize text-muted-foreground border-border/50">{accountType}</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/kyc")}>
            <Pencil className="h-4 w-4 mr-1" /> {t("profile.editProfile")}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column */}
          <div className="glass-card p-6 space-y-1 h-full">
            <h2 className="text-base font-semibold text-foreground mb-4">{t("profile.personalInformation")}</h2>
            <InfoRow label={t("profile.fullName")} value={profile?.full_name} icon={UserIcon} />
            <InfoRow label={t("profile.email")} value={user?.email} icon={Mail} />
            <InfoRow label={t("profile.phone")} value={profile?.phone} icon={Phone} />
            <InfoRow label={t("profile.country")} value={profile?.country} icon={Globe} />
            <InfoRow label={t("profile.dateOfBirth")} value={profile?.date_of_birth} icon={Calendar} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-1">
              <h2 className="text-base font-semibold text-foreground mb-4">{t("profile.identityVerification")}</h2>
              <InfoRow label={t("profile.idType")} value={idTypeLabel} />
              <InfoRow label={t("profile.idNumber")} value={profile?.id_number} />
              <div className="pt-4">
                <Button variant="outline" size="sm" onClick={() => navigate("/kyc", { state: { startStep: 3 } })} className="w-full">
                  {t("profile.updateDocuments")}
                </Button>
              </div>
            </div>

            <div className="glass-card p-6 space-y-1">
              <h2 className="text-base font-semibold text-foreground mb-4">{t("profile.accountDetails")}</h2>
              <InfoRow label={t("profile.accountType")} value={accountType === "business" ? t("kyc.business") : t("kyc.individual")} />
              {accountType === "business" && (
                <>
                  <InfoRow label={t("profile.companyName")} value={profile?.company_name} />
                  <InfoRow label={t("profile.registrationNumber")} value={profile?.company_reg_number} />
                </>
              )}
              {profile?.bank_name && (
                <>
                  <div className="pt-2 pb-1 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">{t("profile.bankInformation")}</div>
                  <InfoRow label={t("profile.bankName")} value={profile?.bank_name} />
                  <InfoRow label={t("profile.accountName")} value={profile?.bank_account_name} />
                  <InfoRow label={t("profile.accountNumberMasked")} value="••••••••" />
                </>
              )}
              <InfoRow label={t("profile.kycStatus")} value={kycVerified ? t("profile.verified") : t("profile.pendingReview")} />
            </div>

            {/* Language Section */}
            <div className="glass-card p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t("profile.language")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t("profile.languageDesc")}</p>
              </div>
              <LanguageSwitcher saveToProfile compact={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
