import { Wallet, FileText, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatsBarProps {
  walletBalance: number;
  activeContracts: number;
  totalEarned: number;
  pendingApproval: number;
  onTopUp?: () => void;
  disabled?: boolean;
}

const StatsBar = ({ walletBalance, activeContracts, totalEarned, pendingApproval, onTopUp, disabled }: StatsBarProps) => {
  const stats = [
    {
      label: "Wallet Balance",
      value: `$${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      accent: true,
      action: (
        <div className="flex gap-2">
          {onTopUp && (
            <Button 
              variant="outline" 
              size="sm" 
              className={`h-7 border-primary/30 text-xs text-primary hover:bg-primary/10 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} 
              onClick={disabled ? undefined : onTopUp}
              disabled={disabled}
            >
              Top Up
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className={`h-7 border-primary/30 text-xs text-primary hover:bg-primary/10 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={disabled}
          >
            Withdraw
          </Button>
        </div>
      ),
    },
    {
      label: "Ongoing Projects",
      value: activeContracts.toString(),
      icon: FileText,
    },
    {
      label: "Total Earned",
      value: `$${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
    },
    {
      label: "Action Items",
      value: pendingApproval.toString(),
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`relative overflow-hidden rounded-xl border p-5 ${
            stat.accent
              ? "border-primary/20 bg-card-elevated"
              : "border-border/50 bg-card-elevated"
          }`}
        >
          {stat.accent && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          )}
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <stat.icon className={`h-4.5 w-4.5 ${stat.accent ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              {stat.action}
            </div>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.accent ? "text-primary" : "text-foreground"}`}>
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
