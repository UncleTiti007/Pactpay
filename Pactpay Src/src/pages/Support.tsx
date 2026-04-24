import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  MessageSquare, Send, Plus, Search, 
  Clock, CheckCircle2, AlertCircle, ChevronRight,
  LifeBuoy, ArrowLeft, MessageSquareText
} from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

const Support = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      
      const channel = supabase
        .channel(`ticket-${selectedTicket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `ticket_id=eq.${selectedTicket.id}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load tickets");
    } else {
      setTickets(data || []);
      if (data && data.length > 0 && !selectedTicket) {
        setSelectedTicket(data[0]);
      }
    }
    setLoading(false);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load messages");
    } else {
      setMessages(data || []);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    const msg = newMessage;
    setNewMessage("");

    const { error } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: user!.id,
        message: msg,
        is_admin_reply: false
      });

    if (error) {
      toast.error("Failed to send message");
      setNewMessage(msg);
    } else {
      // Update ticket updated_at
      await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user!.id,
        subject: newTicketSubject,
        status: 'open',
        priority: 'medium'
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create ticket");
      setLoading(false);
    } else {
      await supabase
        .from("support_messages")
        .insert({
          ticket_id: data.id,
          sender_id: user!.id,
          message: newTicketMessage,
          is_admin_reply: false
        });

      toast.success("Ticket created successfully");
      setIsNewTicketModalOpen(false);
      setNewTicketSubject("");
      setNewTicketMessage("");
      fetchTickets();
      setSelectedTicket(data);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'resolved': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <DashboardNavbar />
      
      <div className="container mx-auto px-4 pt-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/dashboard")}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
              <p className="text-sm text-muted-foreground">Get help with your contracts and account</p>
            </div>
          </div>
          <Button 
            onClick={() => setIsNewTicketModalOpen(true)}
            className="gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            <Plus className="h-4 w-4" /> New Support Ticket
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[700px]">
          {/* Ticket Sidebar */}
          <div className="lg:col-span-4 glass-card overflow-hidden flex flex-col border-primary/10">
            <div className="p-4 border-b border-white/10 bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search tickets..." 
                  className="pl-9 bg-background/50 border-white/10"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading && tickets.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center gap-4">
                  <MessageSquareText className="h-12 w-12 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">No support tickets found</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div 
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={cn(
                      "p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 group",
                      selectedTicket?.id === ticket.id ? "bg-primary/[0.08] relative after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-primary" : ""
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm truncate pr-4">{ticket.subject}</h3>
                      {getStatusIcon(ticket.status)}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">
                      <span>{ticket.status}</span>
                      <span>{formatTimeAgo(ticket.updated_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8 glass-card overflow-hidden flex flex-col border-primary/10 relative">
            {!selectedTicket ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-50">
                <MessageSquare className="h-16 w-16 mb-4 text-muted-foreground/20" />
                <p className="text-muted-foreground">Select a ticket to view the conversation</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 bg-muted/20 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg">{selectedTicket.subject}</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        selectedTicket.status === 'open' ? "bg-blue-500/10 text-blue-500" :
                        selectedTicket.status === 'resolved' ? "bg-emerald-500/10 text-emerald-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {selectedTicket.status}
                      </span>
                      <span>Ticket #{selectedTicket.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      Close Ticket
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-card/10">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        msg.is_admin_reply ? "mr-auto items-start" : "ml-auto items-end"
                      )}
                    >
                      <div className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                        msg.is_admin_reply 
                          ? "bg-muted text-foreground rounded-tl-none border border-white/5" 
                          : "bg-primary text-primary-foreground rounded-tr-none"
                      )}>
                        {msg.message}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1.5 font-medium px-1">
                        {msg.is_admin_reply ? "Pactpay Support" : "You"} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-muted/20">
                  <div className="flex gap-3">
                    <Input 
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={selectedTicket.status === 'closed' || selectedTicket.status === 'resolved'}
                      className="bg-background/50 border-white/10 h-12 focus-visible:ring-primary/30"
                    />
                    <Button 
                      type="submit" 
                      disabled={!newMessage.trim() || selectedTicket.status === 'closed' || selectedTicket.status === 'resolved'}
                      className="h-12 w-12 rounded-xl bg-primary text-primary-foreground hover:scale-105 transition-transform shrink-0"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-xl p-8 border-primary/20 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-2">Create Support Ticket</h2>
            <p className="text-sm text-muted-foreground mb-6">Describe your issue and we'll get back to you as soon as possible.</p>
            
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input 
                  id="subject"
                  placeholder="e.g., Payment issue with milestone"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  required
                  className="bg-muted/30 border-white/10 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message"
                  placeholder="Describe your issue in detail..."
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  className="min-h-[150px] bg-muted/30 border-white/10"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 h-12 border-white/10"
                  onClick={() => setIsNewTicketModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 h-12 bg-primary text-primary-foreground">
                  {loading ? "Creating..." : "Submit Ticket"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
