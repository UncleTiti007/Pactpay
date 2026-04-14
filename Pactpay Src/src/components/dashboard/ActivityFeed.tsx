import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, DollarSign, Mail, Bell, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

const getIconForType = (type: string) => {
  switch (type) {
    case "milestone_approved":
    case "milestone_completed":
      return { icon: CheckCircle2, color: "text-status-completed", bg: "bg-status-completed/10" };
    case "deposit":
    case "payment":
    case "release":
      return { icon: DollarSign, color: "text-status-pending", bg: "bg-status-pending/10" };
    case "invite":
      return { icon: Mail, color: "text-status-active", bg: "bg-status-active/10" };
    case "dispute":
      return { icon: AlertTriangle, color: "text-status-disputed", bg: "bg-status-disputed/10" };
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
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(10);
      
    if (data) setActivities(data);
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card-elevated p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Loading activity...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
        ) : (
          activities.map((item) => {
            const { icon: Icon, color, bg } = getIconForType(item.type);
            return (
              <div key={item.id} className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{item.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
