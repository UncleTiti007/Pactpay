import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, FileText, User, Cpu } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  contract_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string;
  is_system_message: boolean;
  created_at: string;
}

interface ContractDiscussionProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
}

export function ContractDiscussion({ isOpen, onOpenChange, contractId }: ContractDiscussionProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && contractId) {
      fetchMessages();
      
      const channel = supabase
        .channel(`contract-messages-${contractId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'contract_messages',
            filter: `contract_id=eq.${contractId}`
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, contractId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("contract_messages")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
      setTimeout(scrollToBottom, 50);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !sending) || !user) return;
    
    setSending(true);
    try {
      const { error } = await supabase.from("contract_messages").insert({
        contract_id: contractId,
        sender_id: user.id,
        content: newMessage.trim(),
        is_system_message: false
      });

      if (error) throw error;
      setNewMessage("");
    } catch (err: any) {
      toast.error("Failed to send message: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${contractId}/chat/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("contract-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("contract-files")
        .getPublicUrl(filePath);

      const { error: msgError } = await supabase.from("contract_messages").insert({
        contract_id: contractId,
        sender_id: user.id,
        content: `Uploaded file: ${file.name}`,
        attachment_url: publicUrl,
        is_system_message: false
      });

      if (msgError) throw msgError;
      toast.success("File uploaded to chat");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-[400px] flex-col p-0 sm:max-w-[450px]">
        <SheetHeader className="border-b p-6">
          <SheetTitle className="flex items-center gap-2">
            Contract Discussion
            <div className="flex h-2 w-2 rounded-full bg-green-500" />
          </SheetTitle>
          <SheetDescription>
            Discuss contract details and request adjustments here.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-[400px] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <Send className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">No messages yet</h3>
                <p className="text-xs text-muted-foreground">Start the negotiation by sending a message.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                    {m.is_system_message ? (
                      <div className="mx-auto my-2 rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> {m.content}
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                          isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border rounded-tl-none"
                        )}>
                          {m.content}
                          {m.attachment_url && (
                            <a 
                              href={m.attachment_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="mt-2 flex items-center gap-2 rounded-lg bg-black/10 p-2 text-xs hover:bg-black/20 transition-colors"
                            >
                              <FileText className="h-3 w-3" />
                              View Attachment
                            </a>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground px-1">
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </>
                    )}
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4 bg-background">
          <div className="relative flex items-end gap-2">
            <div className="relative flex-1">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[80px] w-full resize-none rounded-xl pr-10 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <input
                  type="file"
                  id="chat-file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  asChild
                >
                  <label htmlFor="chat-file" className="cursor-pointer">
                    <Paperclip className="h-4 w-4" />
                  </label>
                </Button>
              </div>
            </div>
            <Button 
              size="icon" 
              onClick={handleSendMessage} 
              disabled={sending || (!newMessage.trim())}
              className="h-[40px] w-[40px] rounded-xl shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
