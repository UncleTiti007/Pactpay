import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  DollarSign, 
  Clock 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  from_user_id: string | null;
  to_user_id: string | null;
  metadata: any;
}

const Transactions = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (user) fetchTransactions();
  }, [user, authLoading, navigate]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionInfo = (tx: Transaction, userId: string) => {
    const isOutbound = tx.from_user_id === userId;
    const isDeposit = tx.type === 'deposit' || tx.type === 'wallet_topup';
    const isRelease = tx.type === 'release';
    
    if (isDeposit) {
      return {
        label: t("transactions.type.topup"),
        icon: ArrowDownLeft,
        color: "text-green-400",
        bg: "bg-green-400/10",
        prefix: "+"
      };
    }
    
    if (tx.type === 'escrow') {
      return {
        label: t("transactions.type.escrow"),
        icon: ArrowUpRight,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        prefix: "-"
      };
    }
  
    if (isRelease) {
      return {
        label: isOutbound ? t("transactions.type.released") : t("transactions.type.received"),
        icon: isOutbound ? ArrowUpRight : ArrowDownLeft,
        color: isOutbound ? "text-blue-400" : "text-green-400",
        bg: isOutbound ? "bg-blue-400/10" : "bg-green-400/10",
        prefix: isOutbound ? "-" : "+"
      };
    }
  
    return {
      label: t(`transactions.type.${tx.type}`, { defaultValue: tx.type.charAt(0).toUpperCase() + tx.type.slice(1) }),
      icon: DollarSign,
      color: "text-gray-400",
      bg: "bg-gray-400/10",
      prefix: isOutbound ? "-" : "+"
    };
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardNavbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate("/dashboard")}
              className="h-10 w-10 border-border/50 bg-card/30"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t("transactions.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("transactions.subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card-elevated overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">
              {t("transactions.loading")}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
                <Wallet className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-semibold opacity-60">{t("transactions.noTransactions")}</p>
                <p className="text-sm text-muted-foreground">{t("transactions.noTransactionsDesc")}</p>
              </div>
              <Button variant="hero" onClick={() => navigate("/dashboard")}>
                {t("common.backToDashboard")}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {transactions.map((tx) => {
                const info = getTransactionInfo(tx, user!.id);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${info.bg}`}>
                        <info.icon className={`h-5 w-5 ${info.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          {info.label}
                          {tx.metadata?.contract_id && (
                             <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                               {t("common.contract")}
                             </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-md italic mt-0.5">
                          {tx.metadata?.note || tx.metadata?.contract_title || t("transactions.systemTx")}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className={`text-sm font-bold ${info.color}`}>
                        {info.prefix}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-2.5 w-2.5" />
                        {format(new Date(tx.created_at), "MMM d, yyyy • h:mm aa")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
