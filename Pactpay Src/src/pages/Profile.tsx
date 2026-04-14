import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User as UserIcon, Pencil, Check, X, ShieldCheck, Mail, Phone, Globe, Calendar } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchProfile();
    else navigate("/auth");
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error);
      setErrorStatus("Could not load profile. Please complete your KYC.");
      setLoading(false);
      return;
    }

    if (!data) {
      // Initialize a basic profile locally if the DB record is missing
      const newProfile = {
        id: user!.id,
        email: user!.email,
        full_name: user?.user_metadata?.full_name || "",
        kyc_verified: false,
        wallet_balance: 0,
        account_type: "individual"
      };
      setProfile(newProfile);
    } else {
      setProfile(data);

      // Get avatar URL if stored
      if (data.avatar_url) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_url);
        setAvatarUrl(urlData?.publicUrl || null);
      }
    }

    setLoading(false);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="flex min-h-[80vh] items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span>Loading profile...</span>
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
                <h1 className="text-2xl font-bold tracking-tight">Profile Not Setup</h1>
                <p className="text-muted-foreground leading-relaxed">{errorStatus}</p>
              </div>
              <Button variant="hero" onClick={() => navigate("/kyc")} className="w-full h-12 text-base shadow-lg shadow-primary/20">
                Complete KYC Now
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* Header card - Full Width */}
        <div className="glass-card p-6 flex items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-2 ring-border">
                <UserIcon className="h-9 w-9 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{profile?.full_name || "Anonymous"}</h1>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {kycVerified ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              ) : profile?.id_doc_front_url ? (
                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Pending Review
                </Badge>
              ) : (
                <Badge className="bg-primary/10 text-primary border-primary/30 px-2.5 py-0.5 rounded-full">
                  Action Required
                </Badge>
              )}
              <Badge variant="outline" className="capitalize text-muted-foreground border-border/50">{accountType}</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/kyc")}>
            <Pencil className="h-4 w-4 mr-1" /> Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Personal Information */}
          <div className="glass-card p-6 space-y-1 h-full">
            <h2 className="text-base font-semibold text-foreground mb-4">Personal Information</h2>

            <InfoRow label="Full Name" value={profile?.full_name} icon={UserIcon} />
            <InfoRow label="Email" value={user?.email} icon={Mail} />
            <InfoRow label="Phone" value={profile?.phone} icon={Phone} />
            <InfoRow label="Country" value={profile?.country} icon={Globe} />
            <InfoRow label="Date of Birth" value={profile?.date_of_birth} icon={Calendar} />
          </div>

          {/* Right Column: Verification & Accounts */}
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-1">
              <h2 className="text-base font-semibold text-foreground mb-4">Identity Verification</h2>
              <InfoRow label="ID Type" value={profile?.id_type === "national_id" ? "National ID" : profile?.id_type === "passport" ? "Passport" : "Driver's License"} />
              <InfoRow label="ID Number" value={profile?.id_number} />
              <div className="pt-4">
                <Button variant="outline" size="sm" onClick={() => navigate("/kyc", { state: { startStep: 3 } })} className="w-full">
                  Update Documents
                </Button>
              </div>
            </div>

            <div className="glass-card p-6 space-y-1">
              <h2 className="text-base font-semibold text-foreground mb-4">Account Details</h2>
              <InfoRow label="Account Type" value={accountType === "business" ? "Business" : "Individual"} />
              {accountType === "business" && (
                <>
                  <InfoRow label="Company Name" value={profile?.company_name} />
                  <InfoRow label="Registration #" value={profile?.company_reg_number} />
                </>
              )}
              {profile?.bank_name && (
                <>
                  <div className="pt-2 pb-1 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Bank Information</div>
                  <InfoRow label="Bank Name" value={profile?.bank_name} />
                  <InfoRow label="Account Name" value={profile?.bank_account_name} />
                  <InfoRow label="Account Number" value="••••••••" />
                </>
              )}
              <InfoRow label="KYC Status" value={kycVerified ? "Verified" : "Pending Review"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
