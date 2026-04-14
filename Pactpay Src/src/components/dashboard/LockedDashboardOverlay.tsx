import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const LockedDashboardOverlay = () => {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-background/40">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6 shadow-2xl border-primary/20 animate-in fade-in zoom-in duration-300">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
          <Lock className="h-10 w-10 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Verification Required</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your dashboard is currently locked. Complete your profile and identity verification to unlock all features.
          </p>
        </div>

        <Button 
          variant="hero" 
          size="lg" 
          onClick={() => navigate("/profile")}
          className="w-full gap-2 shadow-lg shadow-primary/25 group h-12"
        >
          Go to Profile
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
};

export default LockedDashboardOverlay;
