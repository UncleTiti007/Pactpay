import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, BellDot, Plus, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const DashboardNavbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchNotifications();
      
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev].slice(0, 5));
            setUnreadCount(prev => prev + 1);
            toast.info(payload.new.title, {
              description: payload.new.message,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user!.id)
      .single();

    if (data?.avatar_url) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_url);
      setAvatarUrl(urlData?.publicUrl || null);
    }
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initial = user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">P</span>
          </div>
          <span className="text-lg font-bold text-foreground">Pactpay</span>
        </Link>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-card/50 ring-1 ring-border/50 transition-all hover:bg-card hover:ring-primary/30">
                {unreadCount > 0 ? (
                  <>
                    <BellDot className="h-[1.1rem] w-[1.1rem] text-primary transition-all animate-pulse" />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {unreadCount}
                    </span>
                  </>
                ) : (
                  <Bell className="h-[1.1rem] w-[1.1rem] text-muted-foreground transition-all" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-1">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</span>
                {unreadCount > 0 && (
                   <span className="text-[10px] font-medium text-primary">{unreadCount} new</span>
                )}
              </div>
              <DropdownMenuSeparator className="bg-border/50" />
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className={cn(
                        "flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors focus:bg-primary/5",
                        !n.is_read && "bg-primary/[0.03]"
                      )}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className={cn("text-sm font-bold", !n.is_read ? "text-foreground" : "text-muted-foreground")}>
                          {n.title}
                        </span>
                        {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {n.message}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground overflow-hidden ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <UserIcon className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
