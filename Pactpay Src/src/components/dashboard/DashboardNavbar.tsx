import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Bell, BellDot, Plus, LogOut, User as UserIcon, Sun, Moon,
  Briefcase, DollarSign, ShieldCheck, AlertCircle, CheckCircle2, MessageSquareText
} from "lucide-react";
import PactpayLogo from "@/components/PactpayLogo";
import { toast } from "sonner";
import { cn, formatTimeAgo } from "@/lib/utils";
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
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Initialize theme from localStorage or default to dark
    const savedTheme = localStorage.getItem("theme");
    const isDarkMode = savedTheme === null ? true : savedTheme === "dark";
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchNotifications();
      
      // Optimized Real-time notification listener
      const channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
          },
          (payload) => {
            // Filter locally to ensure UUID matching works perfectly
            if (payload.new.user_id === user.id) {
              console.log("🔔 Notification received!", payload.new);
              setNotifications(prev => [payload.new, ...prev].slice(0, 5));
              setUnreadCount(prev => prev + 1);
              
              // Premium Toast Alert
              toast.info(payload.new.title, {
                description: payload.new.message,
                icon: <Bell className="h-4 w-4" />
              });
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 Notification channel status for ${user.email}:`, status);
        });

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
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
    if (error) {
      toast.error("Failed to mark all as read");
      return;
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    toast.success("All notifications marked as read");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initial = user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <nav className="sticky top-0 z-50 border-b border-primary/15 bg-white/80 dark:bg-background/80 backdrop-blur-xl transition-all">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/dashboard">
          <PactpayLogo size="md" />
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
            <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-primary/20 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllAsRead();
                    }}
                    className="text-[10px] font-bold text-primary hover:text-primary-hover transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator className="m-0 bg-border/50" />
              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
                      <Bell className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 p-4 cursor-pointer transition-all border-b border-border/10 last:border-0 outline-none",
                        !n.is_read ? "bg-primary/[0.03] hover:bg-primary/[0.06] focus:bg-primary/[0.06]" : "hover:bg-muted/30 focus:bg-muted/30"
                      )}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <div className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 transition-all",
                        n.type === 'invite' ? "bg-blue-500/10 ring-blue-500/20 text-blue-500" :
                        n.type === 'payment' ? "bg-emerald-500/10 ring-emerald-500/20 text-emerald-500" :
                        n.type === 'dispute' ? "bg-destructive/10 ring-destructive/20 text-destructive" :
                        "bg-primary/10 ring-primary/20 text-primary"
                      )}>
                        {n.type === 'invite' ? <Briefcase className="h-[1.1rem] w-[1.1rem]" /> :
                         n.type === 'payment' ? <DollarSign className="h-[1.1rem] w-[1.1rem]" /> :
                         n.type === 'dispute' ? <AlertCircle className="h-[1.1rem] w-[1.1rem]" /> :
                         <CheckCircle2 className="h-[1.1rem] w-[1.1rem]" />}
                      </div>
                      <div className="flex flex-col flex-1 gap-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-sm font-bold truncate", !n.is_read ? "text-foreground" : "text-muted-foreground")}>
                            {n.title}
                          </span>
                          {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        <span className="text-[10px] font-medium text-muted-foreground/40 mt-1 flex items-center gap-1">
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full bg-card/50 ring-1 ring-border/50 transition-all hover:bg-card hover:ring-primary/30"
          >
            {isDark ? (
              <Sun className="h-[1.1rem] w-[1.1rem] text-amber-500" />
            ) : (
              <Moon className="h-[1.1rem] w-[1.1rem] text-primary" />
            )}
          </Button>

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
              <DropdownMenuItem onClick={() => navigate("/support")}>
                <MessageSquareText className="mr-2 h-4 w-4" /> Help & Support
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
