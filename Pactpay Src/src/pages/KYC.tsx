import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, ArrowLeft, ArrowRight, Upload, X, User, Building2, ShieldCheck, Lock } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import PactpayLogo from "@/components/PactpayLogo";
import { toYMD, fromYMD } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Belarus","Belgium","Belize","Benin","Bolivia",
  "Bosnia and Herzegovina","Botswana","Brazil","Bulgaria","Burkina Faso","Burundi","Cambodia",
  "Cameroon","Canada","Chile","China","Colombia","Congo","Costa Rica","Croatia","Cuba","Cyprus",
  "Czech Republic","Denmark","Dominican Republic","Ecuador","Egypt","Estonia","Ethiopia","Finland",
  "France","Georgia","Germany","Ghana","Greece","Guatemala","Haiti","Honduras","Hungary","India",
  "Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan",
  "Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia","Mali",
  "Malta","Mexico","Moldova","Monaco","Morocco","Mozambique","Myanmar","Namibia","Nepal",
  "Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","Norway","Oman",
  "Pakistan","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania",
  "Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Sierra Leone","Singapore","Slovakia",
  "Slovenia","Somalia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Sweden",
  "Switzerland","Syria","Tanzania","Thailand","Tunisia","Turkey","Uganda","Ukraine",
  "United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela",
  "Vietnam","Yemen","Zambia","Zimbabwe"
];

type AccountType = "individual" | "business";
type IDType = "national_id" | "passport" | "drivers_license";

interface FileUpload {
  file: File | null;
  preview: string | null;
}

const KYC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [step, setStep] = useState(location.state?.startStep || 1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Step 1 - Personal Info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [avatarUpload, setAvatarUpload] = useState<FileUpload>({ file: null, preview: null });
  const avatarRef = useRef<HTMLInputElement>(null);

  // Security Lock
  const [isNameLocked, setIsNameLocked] = useState(false);

  // Step 2 - Account type
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [companyName, setCompanyName] = useState("");
  const [companyReg, setCompanyReg] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");

  // Step 3 - Identity Verification
  const [idType, setIdType] = useState<IDType>("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [frontUpload, setFrontUpload] = useState<FileUpload>({ file: null, preview: null });
  const [backUpload, setBackUpload] = useState<FileUpload>({ file: null, preview: null });
  const [selfieUpload, setSelfieUpload] = useState<FileUpload>({ file: null, preview: null });
  
  // Storage paths
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [existingFrontUrl, setExistingFrontUrl] = useState<string | null>(null);
  const [existingBackUrl, setExistingBackUrl] = useState<string | null>(null);
  const [existingSelfieUrl, setExistingSelfieUrl] = useState<string | null>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchExistingProfile();
    }
  }, [user]);

  const fetchExistingProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || user?.user_metadata?.full_name || "");
        setPhone(data.phone || "");
        setDob(data.date_of_birth || "");
        setCountry(data.country || "");
        setAccountType(data.account_type || "individual");
        setCompanyName(data.company_name || "");
        setCompanyReg(data.company_reg_number || "");
        setBankName(data.bank_name || "");
        setBankAccountName(data.bank_account_name || "");
        setBankAccountNumber(data.bank_account_number || "");
        setIdType(data.id_type || "national_id");
        setIdNumber(data.id_number || "");
        
        setExistingAvatarUrl(data.avatar_url);
        setExistingFrontUrl(data.id_doc_front_url);
        setExistingBackUrl(data.id_doc_back_url);
        setExistingSelfieUrl(data.id_selfie_url);

        if (data.kyc_verified || data.id_doc_front_url) {
          setIsNameLocked(true);
        }
      }
    } catch (err) {
      console.error("Error fetching existing kyc data:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const isAdult = (dateStr: string) => {
    if (!dateStr) return false;
    const birth = fromYMD(dateStr);
    if (!birth) return false;
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear() -
      (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    return age >= 18;
  };

  useEffect(() => {
    if (accountType === "individual" && fullName) {
      setBankAccountName(fullName);
    }
  }, [fullName, accountType]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: FileUpload) => void,
    imagesOnly = false,
    maxMB = 5
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(t("kyc.error.fileTooLarge", { max: maxMB }));
      return;
    }
    if (imagesOnly && !file.type.startsWith("image/")) {
      toast.error(t("kyc.error.imagesOnly"));
      return;
    }
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!imagesOnly && !allowed.includes(file.type)) {
      toast.error(t("kyc.error.invalidFormat"));
      return;
    }
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setter({ file, preview });
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) {
      toast.error(t("kyc.error.uploadFailed") + ": " + error.message);
      return null;
    }
    return path;
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const canProceedStep1 =
    fullName.trim() &&
    phone.trim() &&
    dob &&
    isAdult(dob) &&
    country &&
    (avatarUpload.file || existingAvatarUrl);

  const canProceedStep2 =
    accountType === "individual" ||
    (companyName.trim() && companyReg.trim());

  const canProceedStep3 =
    idType &&
    idNumber.trim() &&
    (frontUpload.file || existingFrontUrl) &&
    (idType === "passport" || (backUpload.file || existingBackUrl)) &&
    (selfieUpload.file || existingSelfieUrl);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const uid = user.id;

      let avatarUrl: string | null = null;
      if (avatarUpload.file) {
        const ext = avatarUpload.file.name.split(".").pop();
        const path = `${uid}/avatar.${ext}`;
        const { error: avaError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarUpload.file, { upsert: true, contentType: avatarUpload.file.type });
        
        if (!avaError) {
          avatarUrl = path;
        } else {
          toast.error(t("kyc.error.avatarUploadFailed") + ": " + avaError.message);
        }
      }

      const frontPath = frontUpload.file
        ? await uploadFile(frontUpload.file, `${uid}/id_front.${frontUpload.file.name.split(".").pop()}`)
        : existingFrontUrl;
      const backPath = backUpload.file
        ? await uploadFile(backUpload.file, `${uid}/id_back.${backUpload.file.name.split(".").pop()}`)
        : existingBackUrl;
      const selfiePath = selfieUpload.file
        ? await uploadFile(selfieUpload.file, `${uid}/selfie.${selfieUpload.file.name.split(".").pop()}`)
        : existingSelfieUrl;

      if (!frontPath || !selfiePath || (idType !== "passport" && !backPath)) {
        toast.error(t("kyc.error.docsFailed"));
        setSubmitting(false);
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: uid,
        full_name: fullName,
        phone,
        date_of_birth: dob,
        country,
        account_type: accountType,
        bank_name: bankName || null,
        bank_account_name: bankAccountName || null,
        bank_account_number: bankAccountNumber || null,
        id_type: idType,
        id_number: idNumber,
        id_doc_front_url: frontPath,
        id_doc_back_url: backPath,
        id_selfie_url: selfiePath,
        avatar_url: avatarUrl || existingAvatarUrl,
        kyc_verified: false,
        ...(accountType === "business" && { 
          company_name: companyName, 
          company_reg_number: companyReg 
        }),
      });

      if (profileError) {
        toast.error(t("kyc.error.saveFailed") + ": " + profileError.message);
        setSubmitting(false);
        return;
      }

      setStep(4);
    } catch (err: any) {
      toast.error(err.message || t("common.unexpectedError"));
    }
    setSubmitting(false);
  };

  const steps = [
    { icon: User, label: t("kyc.steps.personal") },
    { icon: Building2, label: t("kyc.steps.account") },
    { icon: ShieldCheck, label: t("kyc.steps.identity") },
  ];

  const FileUploadBox = ({
    label,
    upload,
    onClick,
    required,
  }: {
    label: string;
    upload: FileUpload;
    onClick: () => void;
    accept: string;
    required?: boolean;
  }) => (
    <div>
      <Label>{label}{required && <span className="text-destructive ml-1">*</span>}</Label>
      <button
        type="button"
        onClick={onClick}
        className="mt-1 w-full rounded-lg border-2 border-dashed border-border hover:border-primary/60 transition-colors p-4 flex flex-col items-center gap-2 text-center"
      >
        {upload.preview ? (
          <img src={upload.preview} alt="preview" className="h-24 w-24 rounded-lg object-cover" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        {upload.file ? (
          <span className="text-sm text-primary font-medium">{upload.file.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">{t("kyc.clickToUpload")}</span>
        )}
        {upload.file && (
          <span className="text-xs text-muted-foreground">{(upload.file.size / 1024 / 1024).toFixed(2)} MB</span>
        )}
      </button>
    </div>
  );

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass-card max-w-md w-full p-10 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("kyc.success.title")}</h1>
          <p className="text-muted-foreground">
            {t("kyc.success.desc")}
          </p>
          <Button variant="hero" className="w-full mt-2" onClick={() => navigate("/dashboard")}>
            {t("kyc.success.btn")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 md:mb-8 text-center">
          <div className="flex justify-center mb-4">
            <PactpayLogo size="lg" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{t("kyc.title")}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t("kyc.subtitle")}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-10 flex items-start justify-between w-full max-w-sm mx-auto px-2">
          {steps.map((s, idx) => {
            const num = idx + 1;
            const Icon = s.icon;
            return (
              <div key={num} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center relative z-10">
                  <div className={`flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    num < step ? "bg-primary border-primary shadow-lg shadow-primary/20" :
                    num === step ? "border-primary bg-primary/10 ring-4 ring-primary/5" :
                    "border-border bg-card"
                  }`}>
                    {num < step ? <Check className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" /> : <Icon className={`h-4 w-4 md:h-5 md:w-5 ${num === step ? "text-primary" : "text-muted-foreground"}`} />}
                  </div>
                  <span className={`text-[10px] md:text-[11px] mt-2 font-bold uppercase tracking-wider ${num === step ? "text-primary" : "text-muted-foreground/60"}`}>{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-[2px] -mt-7 mx-0">
                    <div className={`h-full transition-all duration-500 ${num < step ? "bg-primary shadow-[0_0_10px_rgba(0,194,124,0.3)]" : "bg-border/40"}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">{t("kyc.personalInfo")}</h2>

            <div className="space-y-3">
              <Label className="flex items-center justify-between">
                <span>{t("kyc.fullName")} <span className="text-destructive">*</span></span>
                {isNameLocked && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded flex items-center gap-1 uppercase font-bold tracking-wider">
                    <Lock className="h-2.5 w-2.5" /> {t("common.locked")}
                  </span>
                )}
              </Label>
              <Input 
                value={fullName} 
                onChange={e => !isNameLocked && setFullName(e.target.value)} 
                placeholder={t("kyc.placeholders.fullName")} 
                readOnly={isNameLocked}
                className={isNameLocked ? "bg-muted/50 opacity-80 cursor-not-allowed border-amber-500/20" : ""}
              />
              {isNameLocked && <p className="text-[10px] text-muted-foreground mt-1">{t("kyc.nameLockedMsg")}</p>}
            </div>

            <div className="space-y-3">
              <Label>{t("kyc.email")} <span className="text-destructive">*</span></Label>
              <Input value={user?.email || ""} readOnly className="opacity-60 cursor-not-allowed" />
            </div>

            <div className="space-y-3">
              <Label>{t("kyc.phone")} <span className="text-destructive">*</span></Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("kyc.placeholders.phone")} type="tel" />
            </div>

            <div className="space-y-3">
              <Label>{t("kyc.dob")} <span className="text-destructive">*</span></Label>
              <DatePicker
                  date={fromYMD(dob)}
                  setDate={(date) => setDob(toYMD(date))}
                  placeholder={t("kyc.placeholders.dob")}
                  calendarProps={{
                    captionLayout: "dropdown",
                    fromYear: 1940,
                    toYear: new Date().getFullYear() - 18,
                  }}
                />
              {dob && !isAdult(dob) && (
                <p className="text-xs text-destructive mt-1">{t("kyc.error.notAdult")}</p>
              )}
            </div>

            {/* Country searchable dropdown */}
            <div className="relative space-y-2">
              <Label>{t("kyc.country")} <span className="text-destructive">*</span></Label>
              <Input
                value={countrySearch || country}
                onChange={e => { setCountrySearch(e.target.value); setShowCountryDropdown(true); }}
                onFocus={() => setShowCountryDropdown(true)}
                placeholder={t("kyc.placeholders.country")}
              />
              {showCountryDropdown && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
                  {filteredCountries.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">{t("common.noResults")}</div>
                  )}
                  {filteredCountries.map(c => (
                    <button
                      key={c}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      onClick={() => { setCountry(c); setCountrySearch(""); setShowCountryDropdown(false); }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {country && <p className="text-xs text-primary mt-1">{t("common.selected")}: {country}</p>}
            </div>

            {/* Avatar upload */}
            <div>
              <Label className="mb-2 block">{t("kyc.profilePic")} <span className="text-destructive">*</span></Label>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileChange(e, setAvatarUpload, true)}
              />
              <FileUploadBox
                label=""
                upload={avatarUpload}
                onClick={() => avatarRef.current?.click()}
                accept="image/*"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => navigate("/profile")}>
                <X className="mr-1 h-4 w-4" /> {t("common.cancel")}
              </Button>
              <Button variant="hero" className="flex-[2]" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                {t("common.next")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t("kyc.accountTypeTitle")}</h2>

            <div className="grid grid-cols-2 gap-3">
              {(["individual", "business"] as AccountType[]).map(t_type => (
                <button
                  key={t_type}
                  type="button"
                  onClick={() => setAccountType(t_type)}
                  className={`rounded-lg border-2 p-4 text-center transition-all ${
                    accountType === t_type ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-border/80"
                  }`}
                >
                  {t_type === "individual" ? <User className="h-6 w-6 mx-auto mb-1" /> : <Building2 className="h-6 w-6 mx-auto mb-1" />}
                  <span className="text-sm font-medium capitalize">{t(`kyc.${t_type}`)}</span>
                </button>
              ))}
            </div>

            {accountType === "business" && (
              <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4">
                <div className="space-y-3">
                  <Label>{t("kyc.businessName")} <span className="text-destructive">*</span></Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ACME Inc." />
                </div>
                <div className="space-y-3">
                  <Label>{t("kyc.regNumber")} <span className="text-destructive">*</span></Label>
                  <Input value={companyReg} onChange={e => setCompanyReg(e.target.value)} placeholder="RC123456" />
                </div>
              </div>
            )}

            <div className="space-y-4 rounded-lg border border-border bg-card/30 p-4">
              <p className="text-sm font-medium text-muted-foreground border-b border-border/50 pb-2 mb-2">{t("kyc.bankDetails")}</p>
              <div className="space-y-3">
                <Label>{t("kyc.bankName")}</Label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Chase Bank" />
              </div>
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span>{t("kyc.accountName")} <span className="text-destructive">*</span></span>
                  {accountType === "individual" && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded flex items-center gap-1 uppercase font-bold tracking-wider">
                      <Lock className="h-2.5 w-2.5" /> {t("common.synced")}
                    </span>
                  )}
                </Label>
                <Input 
                  name="vld_acc_holder"
                  id="vld_acc_holder"
                  value={bankAccountName} 
                  onChange={e => {
                    if (accountType === "business") {
                      const val = e.target.value.replace(/[0-9]/g, '');
                      setBankAccountName(val);
                    }
                  }} 
                  placeholder={t("kyc.placeholders.accountName")} 
                  autoComplete="off-random-string"
                  readOnly={accountType === "individual"}
                  className={accountType === "individual" ? "bg-muted/50 opacity-80 cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-3">
                <Label>{t("kyc.accountNumber")}</Label>
                <Input 
                  name="vld_acc_number"
                  id="vld_acc_number"
                  value={bankAccountNumber} 
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setBankAccountNumber(val);
                  }} 
                  placeholder="0123456789" 
                  type="text"
                  autoComplete="off-random-string"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => setStep(1)} className="h-11 md:h-10 order-2 sm:order-1"><ArrowLeft className="mr-1 h-4 w-4" /> {t("common.back")}</Button>
              <Button variant="hero" className="flex-1 h-11 md:h-10 order-1 sm:order-2" disabled={!canProceedStep2} onClick={() => setStep(3)}>
                {t("common.next")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-foreground">{t("kyc.identityVerification")}</h2>

            <div className="space-y-3">
              <Label>{t("kyc.idType")} <span className="text-destructive">*</span></Label>
              <select
                value={idType}
                onChange={e => setIdType(e.target.value as IDType)}
                className="mt-1 w-full rounded-md border border-input bg-background/50 backdrop-blur-sm h-11 px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-foreground"
              >
                <option value="national_id">{t("kyc.nationalId")}</option>
                <option value="passport">{t("kyc.passport")}</option>
                <option value="drivers_license">{t("kyc.driversLicense")}</option>
              </select>
            </div>

            <div className="space-y-3">
              <Label>{t("kyc.idNumber")} <span className="text-destructive">*</span></Label>
              <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder={t("kyc.placeholders.idNumber")} />
            </div>

            <input ref={frontRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => handleFileChange(e, setFrontUpload, false)} />
            <input ref={backRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => handleFileChange(e, setBackUpload, false)} />
            <input ref={selfieRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleFileChange(e, setSelfieUpload, true)} />

            <FileUploadBox
              label={t("kyc.idFront")}
              upload={frontUpload}
              onClick={() => frontRef.current?.click()}
              accept="image/*,application/pdf"
              required
            />

            {idType !== "passport" && (
              <FileUploadBox
                label={t("kyc.idBack")}
                upload={backUpload}
                onClick={() => backRef.current?.click()}
                accept="image/*,application/pdf"
                required
              />
            )}

            <FileUploadBox
              label={t("kyc.selfie")}
              upload={selfieUpload}
              onClick={() => selfieRef.current?.click()}
              accept="image/*"
              required
            />

            <p className="text-xs text-muted-foreground">{t("kyc.maxFileSizeNote")}</p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => setStep(2)} className="h-11 md:h-10 order-2 sm:order-1"><ArrowLeft className="mr-1 h-4 w-4" /> {t("common.back")}</Button>
              <Button variant="hero" className="flex-1 h-11 md:h-10 order-1 sm:order-2" disabled={!canProceedStep3 || submitting} onClick={handleSubmit}>
                {submitting ? t("common.submitting") : t("kyc.submitBtn")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KYC;
