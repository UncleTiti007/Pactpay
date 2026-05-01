import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, ChevronRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface PendingApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestones: any[];
}

const PendingApprovalsModal = ({ isOpen, onClose, milestones }: PendingApprovalsModalProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5 text-amber-500" />
            {t("modals.pendingApprovals.title")}
          </DialogTitle>
          <DialogDescription>
            {t("modals.pendingApprovals.desc", {
              count: milestones.length,
              plural: milestones.length !== 1 ? "s" : "",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {milestones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
              <Clock className="h-12 w-12 mb-3 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">{t("modals.pendingApprovals.none")}</p>
            </div>
          ) : (
            milestones.map((m) => (
              <button
                key={m.id}
                onClick={() => { navigate(`/contracts/${m.contract_id}`); onClose(); }}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card-elevated hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground line-clamp-1">{m.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {t("modals.pendingApprovals.project")} {m.contracts?.title || t("common.unknown")}
                    </p>
                    <p className="text-xs font-bold text-primary mt-1">${m.amount?.toLocaleString()}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))
          )}
        </div>

        <div className="mt-6">
          <Button variant="outline" className="w-full" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PendingApprovalsModal;
