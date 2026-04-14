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
import { User, Pencil, Check, X } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [saving, setSaving] = useState(false);

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
      .single();

    if (error || !data) {
      console.error("Profile fetch error:", error);
      setErrorStatus("Could not load profile. Please complete your KYC.");
      setLoading(false);
      return;
    }

    setProfile(data);
    setEditName(data.full_name || "");
    setEditPhone(data.phone || "");
    setEditCountry(data.country || "");

    // Get avatar URL if stored
    if (data.avatar_url) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_url);
      setAvatarUrl(urlData?.publicUrl || null);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editName, phone: editPhone, country: editCountry })
      .eq("id", user!.id);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
    } else {
      toast.success("Profile updated!");
      setProfile({ ...profile, full_name: editName, phone: editPhone, country: editCountry });
      setEditing(false);
    }
    setSaving(false);
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
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="container mx-auto max-w-lg px-4 py-20 text-center space-y-6">
          <div className="glass-card p-10 space-y-4">
            <h1 className="text-2xl font-bold">Profile Not Setup</h1>
            <p className="text-muted-foreground">{errorStatus}</p>
            <Button variant="hero" onClick={() => navigate("/kyc")} className="w-full">
              Complete KYC Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const kycVerified = profile?.kyc_verified === true;
  const accountType = profile?.account_type || "individual";

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium">{value || "—"}</span>
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
              {profile?.kyc_verified ? (
                <Badge className="bg-green-600/20 text-green-500 border-green-600/30">✓ Verified</Badge>
              ) : profile?.id_doc_front_url ? (
                <Badge className="bg-amber-600/20 text-amber-500 border-amber-600/30">⏳ Pending Review</Badge>
              ) : (
                <Badge className="bg-blue-600/20 text-blue-500 border-blue-600/30">ℹ️ KYC Required</Badge>
              )}
              <Badge variant="outline" className="capitalize">{accountType}</Badge>
            </div>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit Profile
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Personal Information */}
          <div className="glass-card p-6 space-y-1 h-full">
            <h2 className="text-base font-semibold text-foreground mb-4">Personal Information</h2>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={editCountry} onChange={e => setEditCountry(e.target.value)} />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="hero" onClick={handleSave} disabled={saving}>
                    <Check className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="ghost" onClick={() => { 
                    setEditing(false); 
                    setEditName(profile?.full_name || ""); 
                    setEditPhone(profile?.phone || ""); 
                    setEditCountry(profile?.country || ""); 
                  }}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <InfoRow label="Full Name" value={profile?.full_name} />
                <InfoRow label="Email" value={user?.email} />
                <InfoRow label="Phone" value={profile?.phone} />
                <InfoRow label="Country" value={profile?.country} />
                <InfoRow label="Date of Birth" value={profile?.date_of_birth} />
              </>
            )}
          </div>

          {/* Right Column: Verification & Accounts */}
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-1">
              <h2 className="text-base font-semibold text-foreground mb-4">Identity Verification</h2>
              <InfoRow label="ID Type" value={profile?.id_type === "national_id" ? "National ID" : profile?.id_type === "passport" ? "Passport" : "Driver's License"} />
              <InfoRow label="ID Number" value={profile?.id_number} />
              <div className="pt-4">
                <Button variant="outline" size="sm" onClick={() => navigate("/kyc")} className="w-full">
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
