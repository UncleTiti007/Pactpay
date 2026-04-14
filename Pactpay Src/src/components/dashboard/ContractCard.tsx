import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Calendar, DollarSign } from "lucide-react";

interface ContractCardProps {
  id: string;
  title: string;
  status: string;
  total_amount: number;
  deadline: string | null;
  otherPartyName: string;
  disabled?: boolean;
}

const statusColors: Record<string, string> = {
  draft: "bg-status-draft/20 text-status-draft border-status-draft/30",
  pending: "bg-status-pending/20 text-status-pending border-status-pending/30",
  active: "bg-status-active/20 text-status-active border-status-active/30",
  completed: "bg-status-completed/20 text-status-completed border-status-completed/30",
  disputed: "bg-status-disputed/20 text-status-disputed border-status-disputed/30",
  cancelled: "bg-status-cancelled/20 text-status-cancelled border-status-cancelled/30",
};

const ContractCard = ({ id, title, status, total_amount, deadline, otherPartyName, disabled }: ContractCardProps) => {
  const CardContent = (
    <>
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className={statusColors[status] || statusColors.draft}>
          {status}
        </Badge>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">with {otherPartyName}</p>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5" />
          {total_amount?.toLocaleString() || "0"}
        </span>
        {deadline && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(deadline).toLocaleDateString()}
          </span>
        )}
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className="glass-card block p-5 opacity-70 grayscale-[0.3] cursor-not-allowed">
        {CardContent}
      </div>
    );
  }

  return (
    <Link to={`/contracts/${id}`} className="glass-card block p-5 transition-all hover:border-primary/30">
      {CardContent}
    </Link>
  );
};

export default ContractCard;
