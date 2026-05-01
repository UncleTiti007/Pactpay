import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Calendar, DollarSign } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
  draft: "bg-status-draft/10 text-status-draft/80 dark:bg-status-draft/20 dark:text-status-draft border-status-draft/30",
  pending: "bg-status-pending/10 text-status-pending dark:bg-status-pending/20 border-status-pending/30",
  active: "bg-status-active/10 text-status-active dark:bg-status-active/20 border-status-active/30",
  completed: "bg-status-completed/10 text-status-completed dark:bg-status-completed/20 border-status-completed/30",
  disputed: "bg-status-disputed/10 text-status-disputed dark:bg-status-disputed/20 border-status-disputed/30",
  cancelled: "bg-status-cancelled/10 text-status-cancelled/80 dark:bg-status-cancelled/20 dark:text-status-cancelled border-status-cancelled/30",
  rejected: "bg-status-cancelled/10 text-status-cancelled/80 dark:bg-status-cancelled/20 dark:text-status-cancelled border-status-cancelled/30",
  accepted: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border-teal-500/30",
  funded: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/30",
  revision_requested: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/30",
};

const ContractCard = ({ id, title, status, total_amount, deadline, otherPartyName, disabled }: ContractCardProps) => {
  const { t } = useTranslation();

  const statusKey = status as keyof typeof statusColors;
  const translatedStatus = t(`common.status.${status}`, { defaultValue: status });

  const CardContent = (
    <>
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className={statusColors[statusKey] || statusColors.draft}>
          {translatedStatus}
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
            {formatDate(deadline)}
          </span>
        )}
      </div>
    </>
  );

  if (disabled) {
    return <div className="glass-card block p-5 opacity-70 grayscale-[0.3] cursor-not-allowed">{CardContent}</div>;
  }

  return (
    <Link to={`/contracts/${id}`} className="glass-card block p-5 transition-all hover:border-primary/30">
      {CardContent}
    </Link>
  );
};

export default ContractCard;
