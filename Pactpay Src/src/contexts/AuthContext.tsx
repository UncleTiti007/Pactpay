import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  accountStatus: string;
  isAccessBlocked: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  accountStatus: 'active',
  isAccessBlocked: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState<string>('active');

  const fetchAccountStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', userId)
        .maybeSingle();
      
      if (data?.account_status) {
        setAccountStatus(data.account_status);
      }
    } catch (err) {
      console.error("Error fetching account status:", err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) fetchAccountStatus(session.user.id);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchAccountStatus(session.user.id);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).account_status) {
            setAccountStatus((payload.new as any).account_status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAccessBlocked = accountStatus === 'deactivated' || accountStatus === 'locked';

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, accountStatus, isAccessBlocked }}>
      {children}
    </AuthContext.Provider>
  );
};
