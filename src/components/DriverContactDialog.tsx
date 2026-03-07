import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageSquare, MessageCircle, Send, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useLeadMessages, useSendLeadEmail, useSendLeadSms } from "@/hooks/useLeadMessages";
import { useDirectMessages, useSendDirectMessage, useMarkDirectRead } from "@/hooks/useDirectMessages";
import { formatDate } from "@/lib/dateUtils";
import type { Plan } from "@/hooks/useSubscription";

interface DriverContactDialogProps {
  open: boolean;
  onClose: () => void;
  driver: { id: string; name: string; email: string | null; phone: string | null };
  companyId: string;
  plan: Plan;
}

const PLANS_WITH_EMAIL = new Set<Plan>(["starter", "growth", "unlimited"]);
const PLANS_WITH_SMS  = new Set<Plan>(["unlimited"]);

type Channel = "chat" | "email" | "sms";

export function DriverContactDialog({ open, onClose, driver, companyId, plan }: DriverContactDialogProps) {
  const [channel, setChannel] = useState<Channel>("chat");
  const [subject, setSubject]   = useState("");
  const [body, setBody]         = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const canEmail = PLANS_WITH_EMAIL.has(plan);
  const canSms   = PLANS_WITH_SMS.has(plan);

  // Internal chat thread
  const { data: chatMessages = [], isLoading: loadingChat } = useDirectMessages(
    open && channel === "chat" ? companyId : null,
    open && channel === "chat" ? driver.id  : null,
  );

  // External email/SMS thread (lead_messages, driver.id used as lead_id)
  const { data: extMessages = [], isLoading: loadingExt } = useLeadMessages(
    open && channel !== "chat" ? driver.id : null,
    companyId,
  );

  const sendDirect = useSendDirectMessage();
  const sendEmail  = useSendLeadEmail();
  const sendSms    = useSendLeadSms();
  const markRead   = useMarkDirectRead();

  const isPending = sendDirect.isPending || sendEmail.isPending || sendSms.isPending;

  // Mark incoming chat messages as read when dialog opens / when new ones arrive
  useEffect(() => {
    if (open && channel === "chat" && chatMessages.some((m) => m.senderRole === "driver" && !m.readAt)) {
      markRead.mutate({ companyId, driverId: driver.id, readerRole: "company" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chatMessages.length, channel]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, extMessages.length]);

  const handleSend = () => {
    if (!body.trim()) return;

    if (channel === "chat") {
      sendDirect.mutate(
        { companyId, driverId: driver.id, senderRole: "company", body: body.trim() },
        {
          onSuccess: () => { toast.success("Message sent!"); setBody(""); },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send"),
        },
      );
    } else if (channel === "email") {
      if (!canEmail) { toast.error("Email outreach requires Starter plan or higher."); return; }
      if (!driver.email) { toast.error("This driver has no email on file."); return; }
      sendEmail.mutate(
        { leadId: driver.id, subject: subject.trim() || "CDL opportunity", body: body.trim() },
        {
          onSuccess: () => { toast.success("Email sent!"); setSubject(""); setBody(""); },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send email"),
        },
      );
    } else {
      if (!canSms) { toast.error("SMS outreach requires Unlimited plan."); return; }
      if (!driver.phone) { toast.error("This driver has no phone on file."); return; }
      sendSms.mutate(
        { leadId: driver.id, body: body.trim() },
        {
          onSuccess: () => { toast.success("SMS sent!"); setBody(""); },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send SMS"),
        },
      );
    }
  };

  const isLoadingMsgs = channel === "chat" ? loadingChat : loadingExt;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg flex flex-col gap-0 p-0 max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-base">
            Message — <span className="text-primary">{driver.name}</span>
          </DialogTitle>
          <div className="flex gap-1 text-xs text-muted-foreground mt-1">
            {driver.email && <span>{driver.email}</span>}
            {driver.email && driver.phone && <span>·</span>}
            {driver.phone && <span>{driver.phone}</span>}
          </div>
        </DialogHeader>

        <Separator />

        {/* Message thread */}
        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          {isLoadingMsgs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : channel === "chat" && chatMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Start a conversation. The driver will see this in their dashboard.
            </p>
          ) : channel !== "chat" && extMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Send the first one below.
            </p>
          ) : channel === "chat" ? (
            <div className="space-y-3">
              {chatMessages.map((msg) => {
                const isOut = msg.senderRole === "company";
                return (
                  <div key={msg.id} className={`flex flex-col gap-1 ${isOut ? "items-end" : "items-start"}`}>
                    <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-sm ${
                      isOut
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                      {isOut ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Chat</Badge>
                      <span>{formatDate(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="space-y-3">
              {extMessages.map((msg) => {
                const isOut = msg.direction === "outbound";
                return (
                  <div key={msg.id} className={`flex flex-col gap-1 ${isOut ? "items-end" : "items-start"}`}>
                    <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-sm ${
                      isOut
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}>
                      {msg.channel === "email" && msg.subject && (
                        <p className="font-semibold text-xs mb-1 opacity-80">{msg.subject}</p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                      {isOut ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {msg.channel === "email" ? "Email" : "SMS"}
                      </Badge>
                      <span>{formatDate(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Compose area */}
        <div className="px-6 py-4 space-y-3">
          {/* Channel selector */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={channel === "chat" ? "default" : "outline"}
              className="gap-1.5 text-xs"
              onClick={() => setChannel("chat")}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </Button>
            <Button
              size="sm"
              variant={channel === "email" ? "default" : "outline"}
              className="gap-1.5 text-xs"
              onClick={() => setChannel("email")}
              disabled={!canEmail}
              title={!canEmail ? "Requires Starter plan" : undefined}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
              {!canEmail && <span className="text-[10px] opacity-60 ml-1">Starter+</span>}
            </Button>
            <Button
              size="sm"
              variant={channel === "sms" ? "default" : "outline"}
              className="gap-1.5 text-xs"
              onClick={() => setChannel("sms")}
              disabled={!canSms}
              title={!canSms ? "Requires Unlimited plan" : undefined}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              SMS
              {!canSms && <span className="text-[10px] opacity-60 ml-1">Unlimited</span>}
            </Button>
          </div>

          {channel === "email" && (
            <div className="space-y-1">
              <Label htmlFor="dc-subject" className="text-xs">Subject</Label>
              <Input
                id="dc-subject"
                placeholder="e.g. CDL opportunity — looking for drivers"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-sm h-8"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="dc-body" className="text-xs">Message</Label>
            <Textarea
              id="dc-body"
              placeholder={
                channel === "chat"
                  ? "Send an internal message — the driver will see it on their dashboard..."
                  : channel === "email"
                  ? "Hi [Name], we saw your profile and think you'd be a great fit..."
                  : "Hi! This is [Company]. We have a CDL opportunity..."
              }
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="text-sm resize-none"
            />
            {channel === "sms" && (
              <p className="text-xs text-muted-foreground text-right">{body.length}/160</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              disabled={
                !body.trim() || isPending ||
                (channel === "email" && !canEmail) ||
                (channel === "sms" && !canSms)
              }
              onClick={handleSend}
              className="gap-1.5"
            >
              {isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />}
              {channel === "chat" ? "Send" : channel === "email" ? "Send Email" : "Send SMS"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
