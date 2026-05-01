import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, DollarSign, Mail, Bell, AlertTriangle, Activity,
  TrendingUp, ArrowUpCircle, ShieldCheck, UserCheck 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const getIconForType = (type: string) => {
  switch (type) {
    case "milestone_approved": case "milestone_completed": case "kyc_approved": case "withdrawal_completed":
      return { icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" };
    case "wallet_topup":
      return { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" };
    case "withdrawal_pending":
      return { icon: ArrowUpCircle, color: "text-amber-500", bg: "bg-amber-500/10" };
    case "withdrawal_failed": case "kyc_rejected":
      return { icon: ShieldCheck, color: "text-red-500", bg: "bg-red-500/10" };
    case "deposit": case "payment": case "release":
      return { icon: DollarSign, color: "text-primary", bg: "bg-primary/10" };
    case "invite":
      return { icon: Mail, color: "text-blue-500", bg: "bg-blue-500/10" };
    case "dispute": case "system":
      return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" };
    case "update": case "milestone_submitted":
      return { icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" };
    default:
      return { icon: Bell, color: "text-primary", bg: "bg-primary/10" };
  }
};

const ActivityFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchActivities();
  }, [user]);

  const fetchActivities = async () => {
    try {
      const { data: notifications } = await supabase
        .from("notifications").select("*").eq("user_id", user?.id)
        .order("created_at", { ascending: false }).limit(20);
        
      const { data: transactions } = await supabase
        .from("transactions").select("*")
        .or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`)
        .order("created_at", { ascending: false }).limit(20);

      const transActivities = (transactions || []).map(tx => {
        let message = "";
        let title = "";
        let type = tx.type;
        const isFromMe = tx.from_user_id === user?.id;
        const status = tx.metadata?.status || 'completed';

        if (tx.type === 'wallet_topup') {
          title = t("activity.walletTopUp");
          message = t("activity.walletTopUpMsg", { amount: tx.amount.toLocaleString() });
        } else if (tx.type === 'withdrawal') {
          if (status === 'completed') {
            title = t("activity.withdrawalCompleted");
            message = t("activity.withdrawalCompletedMsg", { amount: tx.amount.toLocaleString() });
            type = 'withdrawal_completed';
          } else if (status === 'failed') {
            title = t("activity.withdrawalRejected");
            message = t("activity.withdrawalRejectedMsg", { amount: tx.amount.toLocaleString() });
            type = 'withdrawal_failed';
          } else {
            title = t("activity.withdrawalPending");
            message = t("activity.withdrawalPendingMsg", { amount: tx.amount.toLocaleString() });
            type = 'withdrawal_pending';
          }
        } else if (tx.type === 'release') {
          title = isFromMe ? t("activity.fundsReleased") : t("activity.paymentReceived");
          message = isFromMe
            ? t("activity.fundsReleasedMsg", { amount: tx.amount.toLocaleString() })
            : t("activity.paymentReceivedMsg", { amount: tx.amount.toLocaleString() });
        } else if (tx.type === 'escrow') {
          title = t("activity.escrowFunded");
          message = t("activity.escrowFundedMsg", { amount: tx.amount.toLocaleString() });
        } else {
          title = tx.type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          message = `$${tx.amount.toLocaleString()}`;
        }

        return { id: `tx-${tx.id}`, type: type || tx.type, title, message, created_at: tx.created_at, category: 'transaction' };
      });

      const merged = [
        ...(notifications || []).map(n => {
          const [displayMessage, smartLink] = (n.message || "").split("|||");
          let title = n.title;
          if (!title) {
            title = n.type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            if (title === 'System') title = 'Notification';
          }
          return { ...n, title, message: displayMessage, smartLink, category: 'notification' };
        }),
        ...transActivities
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(merged.slice(0, 15));
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5 shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
          {t("activity.recentActivity")}
        </h3>
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      </div>

      <div className="space-y-1 relative pr-1">
        <div className="max-h-[340px] overflow-y-auto custom-scrollbar pr-2 -mr-2">
          <div className="space-y-5 py-1">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-2 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 dark:text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground italic">{t("activity.noRecentActivity")}</p>
              </div>
            ) : (
              activities.map((item, idx) => {
                const { icon: Icon, color, bg } = getIconForType(item.type);
                const isClickable = !!(item.link || item.smartLink || item.category === 'transaction');
                return (
                  <div key={item.id}
                    className={cn("flex items-start gap-3 animate-in fade-in slide-in-from-right-2 duration-300 group", isClickable ? "cursor-pointer" : "")}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    onClick={() => {
                      if (item.category === 'notification') {
                        const targetLink = item.smartLink || item.link;
                        if (targetLink) navigate(targetLink);
                      } else if (item.category === 'transaction') {
                        navigate('/transactions');
                      }
                    }}>
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg} transition-all group-hover:scale-110`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground leading-snug mb-0.5 group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-[13px] text-muted-foreground leading-snug group-hover:text-foreground/80 transition-colors">{item.message}</p>
                      <p className="mt-1 text-[10px] items-center flex gap-1 text-muted-foreground/50 font-medium">
                        <span className="capitalize">{item.category === 'transaction' ? t("activity.transaction") : t("activity.notification")}</span>
                        <span>•</span>
                        {item.created_at ? (() => { try { const d = new Date(item.created_at); return isNaN(d.getTime()) ? t("activity.recently") : formatDistanceToNow(d, { addSuffix: true }); } catch { return t("activity.recently"); } })() : t("activity.recently")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        {activities.length > 5 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card-elevated to-transparent pointer-events-none" />
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.1); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); }
      `}</style>
    </div>
  );
};

export default ActivityFeed;
