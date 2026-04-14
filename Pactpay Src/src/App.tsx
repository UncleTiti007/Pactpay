import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAccessBlocked, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  if (isAccessBlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="glass-card p-8 max-w-md border-red-500/30">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Account Restricted</h1>
          <p className="text-muted-foreground mb-6">
            Your account has been deactivated or locked by an administrator. Please contact support if you believe this is an error.
          </p>
          <button 
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/contracts/new" element={<CreateContract />} />
      <Route path="/contracts/:id" element={<ContractDetail />} />
      <Route path="/invite/:token" element={<InviteAccept />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/kyc" element={<KYC />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
