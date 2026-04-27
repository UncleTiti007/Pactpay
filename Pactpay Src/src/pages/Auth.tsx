import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Check, X, ShieldCheck } from "lucide-react";
import PactpayLogo from "@/components/PactpayLogo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FormMode = "signin" | "signup" | "forgot" | "update";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "update-password" 
    ? "update" 
    : searchParams.get("mode") === "signup" 
      ? "signup" 
      : "signin";

  const [formMode, setFormMode] = useState<FormMode>(initialMode);
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isUnverified, setIsUnverified] = useState(false);

  // Password Validation Logic
  const passwordRequirements = useMemo(() => {
    return {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  useEffect(() => {
    // If redirected with unverified flag
    if (searchParams.get("unverified") === "true") {
      setIsUnverified(true);
      setFormMode("signin");
    }

    // If we just got confirmed, force sign out so they must sign in manually as requested
    if (searchParams.get("confirmed") === "true") {
      const performSignOut = async () => {
        await supabase.auth.signOut();
        setIsUnverified(false);
        toast.success("Email confirmed successfully! Please sign in to continue.");
        // Clean up the URL
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete("confirmed");
        newParams.delete("unverified");
        navigate("/auth?" + newParams.toString(), { replace: true });
      };
      performSignOut();
      return;
    }

    if (user) {
      checkProfile(user.id);
    }
  }, [user, searchParams]);

  const checkProfile = async (userId: string) => {
    // First check if email is confirmed (unless it's Google)
    const isGoogle = user?.app_metadata?.provider === 'google';
    if (!user?.email_confirmed_at && !isGoogle) {
      console.log("Auth: User email not confirmed, showing verification state");
      setIsUnverified(true);
      await supabase.auth.signOut();
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("kyc_verified, full_name, is_admin, email, consent_given")
      .eq("id", userId)
      .maybeSingle();

    const redirectPath = searchParams.get("redirect");
    console.log("Auth: Checking profile for redirect:", redirectPath);

    // Determine admin status from profile, user metadata or email
    const isAdmin = profile?.is_admin || user?.user_metadata?.role === 'admin' || user?.email === 'admin@pactpay.com';

    if (isAdmin) {
      if (!profile) {
        console.log("Auth: Admin profile missing, creating...");
        await supabase.from("profiles").insert({
          id: userId,
          full_name: user?.user_metadata?.full_name || 'Pactpay Admin',
          is_admin: true,
          email: user?.email?.toLowerCase(),
          account_status: 'active'
        });
      }
      navigate(redirectPath || "/admin");
    } else {
      // First check for consent
      if (profile && !profile.consent_given) {
        console.log("Auth: Consent not given, redirecting to /consent");
        navigate("/consent" + (redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""));
        return;
      }

      if (!profile || !profile.full_name) {
        console.log("Auth: User profile missing or incomplete, redirecting to /consent (for new user) or /kyc");
        
        // If profile doesn't exist at all, create basic entry
        if (!profile) {
          await supabase.from("profiles").insert({
            id: userId,
            full_name: user?.user_metadata?.full_name || '',
            email: user?.email?.toLowerCase(),
            account_status: 'active'
          });
          
          // NEW USER always goes to consent first
          navigate("/consent" + (redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""));
        } else {
          // If profile exists but no full_name, it means they might have passed consent but not KYC
          navigate(redirectPath || "/kyc");
        }
      } else {
        // Update email if missing
        if (!profile.email && user?.email) {
          await supabase.from("profiles").update({ email: user.email.toLowerCase() }).eq("id", userId);
        }
        
        console.log("Auth: Profile found, redirecting to dashboard");
        navigate(redirectPath || "/dashboard");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth" },
    });
    if (error) toast.error(error.message);
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: window.location.origin + "/auth?confirmed=true"
      }
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email resent!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formMode === "signup" && !isPasswordValid) {
      toast.error("Please meet all password requirements.");
      return;
    }

    setLoading(true);
    setIsUnverified(false);

    try {
      if (formMode === "signup") {
        const { data: { user: signedUpUser }, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin + "/auth?confirmed=true",
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already exists")) {
            toast.info("An account with this email already exists. Please sign in instead.");
            setFormMode("signin");
          } else {
            toast.error(error.message);
          }
        } else if (signedUpUser) {
          toast.success("Check your email to confirm your account, then sign in here.");
          setFormMode("signin");
        }
      } else if (formMode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          toast.error(error.message);
        } else if (data.user && !data.user.email_confirmed_at) {
          // Manually handle unverified state even if Supabase allows login
          setIsUnverified(true);
          await supabase.auth.signOut();
          toast.error("Please verify your email before logging in.");
        }
      } else if (formMode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth?mode=update-password",
        });
        if (error) toast.error(error.message);
        else toast.success("Password reset link sent to your email!");
      } else if (formMode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) toast.error(error.message);
        else {
          toast.success("Password updated successfully! Please sign in.");
          setFormMode("signin");
          setPassword("");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getPageContent = () => {
    switch (formMode) {
      case "signup": return { title: "Create your account", sub: "Start protecting your work today" };
      case "forgot": return { title: "Reset password", sub: "Enter your email to receive a reset link" };
      case "update": return { title: "Update password", sub: "Enter a new strong password" };
      default: return { title: "Welcome back", sub: "Sign in to your account" };
    }
  };

  const { title, sub } = getPageContent();

  const Requirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-emerald-500' : 'text-muted-foreground'}`}>
      {met ? (
        <Check className="h-3 w-3" />
      ) : (
        <X className="h-3 w-3 text-destructive" />
      )}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center">
          <PactpayLogo size="lg" />
        </Link>

        <div className="glass-card p-6 md:p-8 relative">
          <button 
            type="button"
            onClick={() => {
              if (formMode === "forgot" || formMode === "update") setFormMode("signin");
              else navigate("/");
            }}
            className="absolute left-4 md:left-6 top-4 md:top-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors group"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          
          <h2 className="mb-2 text-center text-xl md:text-2xl font-bold text-foreground mt-4 md:mt-2">{title}</h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">{sub}</p>

          {isUnverified && (
            <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">!</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-500">Email Verification Required</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    We've sent a confirmation link to your email. Please click it to activate your account.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-9 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                onClick={handleResendVerification}
                disabled={loading}
              >
                {loading ? "Sending..." : "Resend Verification Email"}
              </Button>
            </div>
          )}

          {formMode !== "update" && (
            <>
              <Button
                variant="outline"
                className="mb-4 w-full gap-2 bg-foreground text-background hover:bg-foreground/90"
                onClick={handleGoogleSignIn}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {formMode === "signup" && (
              <div>
                <Label htmlFor="fullName">Full name <span className="text-destructive">*</span></Label>
                <Input
                  id="fullName"
                  name="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
            )}
            
            {formMode !== "update" && (
              <div>
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            )}
            
            {(formMode === "signin" || formMode === "signup" || formMode === "update") && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="password">
                    {formMode === "update" ? "New Password" : "Password"} <span className="text-destructive">*</span>
                  </Label>
                  {formMode === "signin" && (
                    <button 
                      type="button" 
                      onClick={() => setFormMode("forgot")}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={formMode === "signup" ? 8 : 6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {formMode === "signup" && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Password Requirements</p>
                      {isPasswordValid && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />}
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      <Requirement met={passwordRequirements.length} text="At least 8 characters" />
                      <Requirement met={passwordRequirements.uppercase} text="One uppercase letter" />
                      <Requirement met={passwordRequirements.lowercase} text="One lowercase letter" />
                      <Requirement met={passwordRequirements.number} text="One number" />
                      <Requirement met={passwordRequirements.symbol} text="One symbol (e.g. !@#$)" />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <Button 
                      type="submit" 
                      variant="hero" 
                      className="w-full" 
                      disabled={loading || (formMode === "signup" && !isPasswordValid)}
                    >
                      {loading ? "Loading..." : formMode === "signup" ? "Create Account" : formMode === "forgot" ? "Send Reset Link" : formMode === "update" ? "Update Password" : "Sign In"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {formMode === "signup" && !isPasswordValid && password.length > 0 && (
                  <TooltipContent side="bottom" className="bg-destructive text-destructive-foreground border-none">
                    <p>Password requirements not met</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </form>

          {formMode !== "update" && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {formMode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
              <button 
                onClick={() => setFormMode(formMode === "signup" ? "signin" : "signup")} 
                className="font-medium text-primary hover:underline"
              >
                {formMode === "signup" ? "Sign in" : "Sign up"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
