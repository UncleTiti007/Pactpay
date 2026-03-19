import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar } from "lucide-react";

interface DemoContractCardProps {
  title: string;
  status: string;
  amount: number;
  deadline: string;
  otherParty: string;
  otherPartyRole: "Freelancer" | "Client";
  milestones?: { completed: number; total: number };
  extraLabel?: string;
}

const statusBorderColors: Record<string, string> = {
  active: "border-l-status-active",
  pending: "border-l-status-pending",
  completed: "border-l-status-completed",
  draft: "border-l-status-draft",
  disputed: "border-l-status-disputed",
};

const statusBadgeStyles: Record<string, string> = {
  active: "bg-status-active/15 text-status-active border-status-active/30",
  pending: "bg-status-pending/15 text-status-pending border-status-pending/30",
  completed: "bg-status-completed/15 text-status-completed border-status-completed/30",
  draft: "bg-status-draft/15 text-status-draft border-status-draft/30",
  disputed: "bg-status-disputed/15 text-status-disputed border-status-disputed/30",
};

const DemoContractCard = ({
  title,
  status,
  amount,
  deadline,
  otherParty,
  otherPartyRole,
  milestones,
  extraLabel,
}: DemoContractCardProps) => {
  const initials = otherParty
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div
      className={`relative rounded-xl border border-border/50 border-l-4 bg-card-elevated p-5 transition-all hover:border-border ${statusBorderColors[status] || "border-l-status-draft"}`}
    >
      {/* Demo pill */}
      <span className="absolute right-3 top-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Demo
      </span>

      <div className="mb-3 flex items-start justify-between pr-12">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className={statusBadgeStyles[status]}>
          {status}
        </Badge>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {initials}
        </div>
        <span className="text-sm text-muted-foreground">
          {otherPartyRole}: {otherParty}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-4 text-sm">
        <span className="font-bold text-primary">${amount.toLocaleString()}</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {deadline}
        </span>
      </div>

      {milestones && (
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Milestones</span>
            <span>
              {milestones.completed}/{milestones.total}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(milestones.completed / milestones.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {extraLabel && (
        <span className="inline-block rounded-md bg-status-pending/10 px-2 py-0.5 text-xs font-medium text-status-pending">
          {extraLabel}
        </span>
      )}

      <div className="mt-3 flex justify-end">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default DemoContractCard;
