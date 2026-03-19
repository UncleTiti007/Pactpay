import { CheckCircle2, DollarSign, Mail } from "lucide-react";

const demoActivities = [
  {
    icon: CheckCircle2,
    iconColor: "text-status-completed",
    iconBg: "bg-status-completed/10",
    text: "Sarah M. marked milestone 1 as complete",
    time: "2 hours ago",
  },
  {
    icon: DollarSign,
    iconColor: "text-status-pending",
    iconBg: "bg-status-pending/10",
    text: "Deposit of $1,200 confirmed for Brand Identity",
    time: "1 day ago",
  },
  {
    icon: Mail,
    iconColor: "text-status-active",
    iconBg: "bg-status-active/10",
    text: "New contract invitation from David K.",
    time: "3 days ago",
  },
];

const ActivityFeed = () => (
  <div className="rounded-xl border border-border/50 bg-card-elevated p-5">
    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      Recent Activity
    </h3>
    <div className="space-y-4">
      {demoActivities.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconBg}`}>
            <item.icon className={`h-4 w-4 ${item.iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-foreground">{item.text}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ActivityFeed;
