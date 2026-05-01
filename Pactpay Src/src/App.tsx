import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect, ReactNode } from "react";
import { toast } from "sonner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

import Dashboard from "./pages/Dashboard";
import CreateContract from "./pages/CreateContract";
import ContractDetail from "./pages/ContractDetail";
import InviteAccept from "./pages/InviteAccept";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import KYC from "./pages/KYC";
import Profile from "./pages/Profile";
import Transactions from "./pages/Transactions";
import Support from "./pages/Support";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Consent from "./pages/Consent";
import { useTranslation } from "react-i18next";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isEmailVerified, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is logged in but NOT verified, force them out
    if (!loading && user && !isEmailVerified) {
      console.log("ProtectedRoute: User is unverified, signing out...");
      signOut().then(() => {
        navigate("/auth?unverified=true", { replace: true });
      });
    }
  }, [user, isEmailVerified, loading, signOut, navigate]);

  if (loading) return null;
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isEmailVerified) {
    return null; // The useEffect handles the redirect/signOut
  }

  return <>{children}</>;
};

const AppContent = () => {
  const { isAccessBlocked, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (loading) return null;

  if (isAccessBlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="glass-card p-8 max-w-md border-red-500/30">
          <h1 className="text-2xl font-bold text-red-500 mb-4">{t("auth.restricted.title", { defaultValue: "Account Restricted" })}</h1>
          <p className="text-muted-foreground mb-6">
            {t("auth.restricted.message", { defaultValue: "Your account has been deactivated or locked by an administrator. Please contact support if you believe this is an error." })}
          </p>
          <button 
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {t("nav.signOut")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/invite/:token" element={<InviteAccept />} />
      
      {/* Protected Routes */}
      <Route path="/consent" element={<ProtectedRoute><Consent /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/contracts/new" element={<ProtectedRoute><CreateContract /></ProtectedRoute>} />
      <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/kyc" element={<ProtectedRoute><KYC /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
