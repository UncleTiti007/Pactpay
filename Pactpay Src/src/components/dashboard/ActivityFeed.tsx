import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, DollarSign, Mail, Bell, AlertTriangle, 
  TrendingUp, ArrowUpCircle, ShieldCheck, UserCheck 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

const getIconForType = (type: string) => {
  switch (type) {
    case "milestone_approved":
    case "milestone_completed":
    case "kyc_approved":
    case "withdrawal_completed":
      return { icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" };
    case "wallet_topup":
      return { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" };
    case "withdrawal_pending":
      return { icon: ArrowUpCircle, color: "text-amber-500", bg: "bg-amber-500/10" };
    case "withdrawal_failed":
    case "kyc_rejected":
      return { icon: ShieldCheck, color: "text-red-500", bg: "bg-red-500/10" };
    case "deposit":
    case "payment":
    case "release":
      return { icon: DollarSign, color: "text-primary", bg: "bg-primary/10" };
    case "invite":
      return { icon: Mail, color: "text-blue-500", bg: "bg-blue-500/10" };
    case "dispute":
      return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" };
    case "kyc_rejected":
      return { icon: ShieldCheck, color: "text-red-500", bg: "bg-red-500/10" };
    default:
      return { icon: Bell, color: "text-primary", bg: "bg-primary/10" };
  }
};

const ActivityFeed = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchActivities();
  }, [user]);

  const fetchActivities = async () => {
    try {
      // 1. Fetch from notifications table
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);
        
      // 2. Fetch from transactions table (Major financial events)
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`)
        .order("created_at", { ascending: false })
        .limit(10);

      // 3. Normalize transactions into activity-like objects
      const transActivities = (transactions || []).map(t => {
        let message = "";
        let type = t.type;
        const isFromMe = t.from_user_id === user?.id;
        const status = t.metadata?.status || 'completed';

        if (t.type === 'wallet_topup') {
          message = `Wallet topped up by $${t.amount.toLocaleString()}`;
        } else if (t.type === 'withdrawal') {
          if (status === 'completed') {
            message = `Withdrawal of $${t.amount.toLocaleString()} completed`;
            type = 'withdrawal_completed';
          } else if (status === 'failed') {
            message = `Withdrawal of $${t.amount.toLocaleString()} rejected`;
            type = 'withdrawal_failed';
          } else {
            message = `Withdrawal request for $${t.amount.toLocaleString()}`;
            type = 'withdrawal_pending';
          }
        } else if (t.type === 'release') {
          message = isFromMe ? `Funds released: $${t.amount.toLocaleString()}` : `Payment received: $${t.amount.toLocaleString()}`;
        } else if (t.type === 'escrow') {
          message = `Escrow funded: $${t.amount.toLocaleString()}`;
        } else {
          message = `${t.type.replace('_', ' ')}: $${t.amount.toLocaleString()}`;
        }

        return {
          id: `tx-${t.id}`,
          type: type || t.type,
          message,
          created_at: t.created_at,
          category: 'transaction'
        };
      });

      // 4. Merge and sort
      const merged = [
        ...(notifications || []).map(n => ({ ...n, category: 'notification' })),
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
    <div className="rounded-xl border border-border/50 bg-card-elevated p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
          Recent Activity
        </h3>
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      </div>

      <div className="space-y-1 relative pr-1">
        {/* Scrollable Container */}
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
                <Bell className="h-8 w-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground italic">No recent activity</p>
              </div>
            ) : (
              activities.map((item, idx) => {
                const { icon: Icon, color, bg } = getIconForType(item.type);
                return (
                  <div 
                    key={item.id} 
                    className="flex items-start gap-3 animate-in fade-in slide-in-from-right-2 duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg} transition-transform hover:scale-110`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-tight">{item.message}</p>
                      <p className="mt-1 text-[10px] items-center flex gap-1 text-muted-foreground/70 font-medium">
                        <span className="capitalize">{item.category}</span>
                        <span>•</span>
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Scoped Gradient Overlay (Bottom) */}
        {activities.length > 5 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card-elevated to-transparent pointer-events-none" />
        )}
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
        }
      `}</style>
    </div>
  );
};

export default ActivityFeed;
