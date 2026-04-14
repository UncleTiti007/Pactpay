import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // If we just got confirmed, force sign out so they must sign in manually as requested
    if (searchParams.get("confirmed") === "true") {
      const performSignOut = async () => {
        await supabase.auth.signOut();
        toast.success("Email confirmed successfully! Please sign in to continue.");
        // Clean up the URL
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete("confirmed");
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
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("kyc_verified, full_name, is_admin, email")
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
      if (!profile) {
        console.log("Auth: User profile missing, creating...");
        const { error: insertError } = await supabase.from("profiles").insert({
          id: userId,
          full_name: user?.user_metadata?.full_name || '',
          email: user?.email?.toLowerCase(),
          account_status: 'active'
        });

        if (insertError) {
          console.error("Auth: Failed to create profile:", insertError);
          toast.error("Could not initialize profile. Please contact support.");
          // Stay on auth page or try again
          return;
        }
        
        // New user MUST go to KYC
        navigate(redirectPath || "/kyc");
      } else {
        // Update email if missing
        if (!profile.email && user?.email) {
          await supabase.from("profiles").update({ email: user.email.toLowerCase() }).eq("id", userId);
        }
        
        // If full_name is missing, they haven't finished Step 1 of KYC
        if (!profile.full_name) {
          console.log("Auth: Profile incomplete, redirecting to KYC");
          navigate(redirectPath || "/kyc");
        } else {
          console.log("Auth: Profile found, redirecting to dashboard");
          navigate(redirectPath || "/dashboard");
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const specialCharRegex = /[^A-Za-z0-9]/;
      if (!specialCharRegex.test(password)) {
        toast.error("Password must contain at least one special character.");
        setLoading(false);
        return;
      }

      // Check for existing email in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        toast.error("This email is already registered. Please sign in instead.");
        setLoading(false);
        return;
      }

      const redirectParam = searchParams.get("redirect");
      const redirectTo = window.location.origin + "/auth?confirmed=true" + (redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : "");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: redirectTo,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email to confirm your account, then sign in here.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">P</span>
          </div>
          <span className="text-lg font-bold text-foreground">Pactpay</span>
        </Link>

        <div className="glass-card p-8">
          <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Start protecting your work today" : "Sign in to your account"}
          </p>

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
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  name="name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-primary hover:underline">
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
