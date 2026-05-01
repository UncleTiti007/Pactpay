import { Wallet, FileText, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface StatsBarProps {
  walletBalance: number;
  activeContracts: number;
  totalEarned: number;
  pendingApproval: number;
  onTopUp?: () => void;
  onWithdraw?: () => void;
  onPendingApprovalClick?: () => void;
  disabled?: boolean;
}

const StatsBar = ({ walletBalance, activeContracts, totalEarned, pendingApproval, onTopUp, onWithdraw, onPendingApprovalClick, disabled }: StatsBarProps) => {
  const { t } = useTranslation();

  const stats = [
    {
      label: t("stats.walletBalance"),
      value: `$${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      accent: true,
      action: (
        <div className="flex gap-1.5 flex-wrap justify-end">
          {onTopUp && (
            <Button variant="outline" size="sm"
              className={`h-8 px-2.5 border-primary/30 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={disabled ? undefined : onTopUp} disabled={disabled}>
              {t("stats.topUp")}
            </Button>
          )}
          <Button variant="outline" size="sm"
            className={`h-8 px-2.5 border-primary/30 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={disabled} onClick={disabled ? undefined : onWithdraw}>
            {t("stats.withdraw")}
          </Button>
        </div>
      ),
    },
    { label: t("stats.ongoingProjects"), value: activeContracts.toString(), icon: FileText, tint: "dark:bg-card-elevated" },
    { label: t("stats.totalEarned"), value: `$${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: TrendingUp, tint: "dark:bg-card-elevated" },
    { label: t("stats.pendingApproval"), value: pendingApproval.toString(), icon: Clock, tint: "dark:bg-card-elevated", onClick: onPendingApprovalClick },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} onClick={stat.onClick}
          className={`relative overflow-hidden rounded-xl border p-5 border-l-[3px] border-l-primary transition-all hover:scale-[1.01] ${stat.onClick ? "cursor-pointer hover:border-primary/40" : ""} ${
            stat.accent
              ? "border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] dark:from-card-elevated dark:to-card-elevated"
              : `glass-card border-l-[3px] border-l-primary/60 ${(stat as any).tint || ''}`
          }`}>
          {stat.accent && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />}
          <div className="relative">
            <div className="mb-3 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                <stat.icon className={`h-5 w-5 ${stat.accent ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              {stat.action}
            </div>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.accent ? "text-primary" : "text-foreground"}`}>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
