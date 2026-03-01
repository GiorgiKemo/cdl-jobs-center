import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, MessageSquare } from "lucide-react";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkRead,
  type ConversationSummary,
  type Message,
  type MessageDeliveryStatus,
} from "@/hooks/useMessages";
import { timeAgo, formatTime } from "@/lib/dateUtils";
import { Spinner } from "@/components/ui/Spinner";

interface ChatPanelProps {
  userId: string;
  userRole: "driver" | "company";
  userName: string;
  initialApplicationId?: string | null;
  initialDriverId?: string | null;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusLabel(status: MessageDeliveryStatus): string {
  if (status === "failed_to_deliver") return "Failed to deliver";
  if (status === "sent") return "Sent";
  if (status === "delivered") return "Delivered";
  return "Read";
}

function resolveMessageStatus(msg: Message): MessageDeliveryStatus {
  if (msg.readAt) return "read";
  return msg.deliveryStatus ?? (msg.id.startsWith("temp-") ? "sent" : "delivered");
}

export function ChatPanel({ userId, userRole, userName, initialApplicationId, initialDriverId }: ChatPanelProps) {
  const { data: conversations = [], isLoading } = useConversations(userId, userRole);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(initialApplicationId ?? null);
  const [draft, setDraft] = useState("");
  const sendMessage = useSendMessage();
  const markRead = useMarkRead();
  const lastMarkedKey = useRef<string | null>(null);
  const resolvedDriverDeepLinkKey = useRef<string | null>(null);

  // Pre-select conversation from prop
  useEffect(() => {
    if (initialApplicationId) setSelectedAppId(initialApplicationId);
  }, [initialApplicationId]);

  // Fallback deep-linking by driver id for company users, in case app id is stale or mismatched.
  useEffect(() => {
    if (!initialDriverId || userRole !== "company" || conversations.length === 0) return;
    const deepLinkKey = `${initialApplicationId ?? ""}:${initialDriverId}`;
    if (resolvedDriverDeepLinkKey.current === deepLinkKey) return;

    const exactMatch = conversations.find(
      (c) => c.applicationId === initialApplicationId && c.driverId === initialDriverId,
    );
    const latestForDriver = conversations.find((c) => c.driverId === initialDriverId);
    const target = exactMatch ?? latestForDriver;
    if (target && target.applicationId !== selectedAppId) {
      setSelectedAppId(target.applicationId);
    }

    resolvedDriverDeepLinkKey.current = deepLinkKey;
  }, [conversations, initialApplicationId, initialDriverId, selectedAppId, userRole]);

  const selected = conversations.find((c) => c.applicationId === selectedAppId) ?? null;

  // Mark messages as read when opening a conversation
  useEffect(() => {
    if (!selectedAppId || !selected || selected.unreadCount <= 0) return;
    const key = `${selectedAppId}:${selected.unreadCount}`;
    if (lastMarkedKey.current === key) return;
    lastMarkedKey.current = key;
    markRead.mutate({ applicationId: selectedAppId, userId });
  }, [selectedAppId, selected, markRead, userId]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !selectedAppId) return;
    sendMessage.mutate({
      applicationId: selectedAppId,
      senderId: userId,
      senderRole: userRole,
      body,
    });
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Mobile: show chat window if a conversation is selected
  const showList = !selectedAppId;

  return (
    <div className="border border-border bg-card overflow-hidden h-[60vh] min-h-[400px] max-h-[800px]">
      <div className="flex h-full">
        {/* Conversation list */}
        <div className={`w-full md:w-[22rem] md:shrink-0 border-r border-border flex flex-col ${!showList ? "hidden md:flex" : "flex"}`}>
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm">Messages</p>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Spinner size="sm" /></div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p>No conversations yet.</p>
                <p className="text-xs mt-1">
                  {userRole === "company"
                    ? "Conversations appear when drivers apply to your jobs."
                    : "Apply to jobs to start messaging."}
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationRow
                  key={conv.applicationId}
                  conv={conv}
                  isActive={conv.applicationId === selectedAppId}
                  onClick={() => setSelectedAppId(conv.applicationId)}
                />
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat window */}
        <div className={`flex-1 flex flex-col min-w-0 ${showList ? "hidden md:flex" : "flex"}`}>
          {!selectedAppId || !selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <ChatWindow
              conv={selected}
              userId={userId}
              userRole={userRole}
              draft={draft}
              setDraft={setDraft}
              onSend={handleSend}
              onKeyDown={handleKeyDown}
              onBack={() => setSelectedAppId(null)}
              sending={sendMessage.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Conversation list row ──────────────────────────────────────────── */
function ConversationRow({
  conv,
  isActive,
  onClick,
}: {
  conv: ConversationSummary;
  isActive: boolean;
  onClick: () => void;
}) {
  const hasUnread = conv.unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={`relative w-full min-w-0 overflow-hidden text-left flex items-center gap-3 px-4 py-3 border-b border-border transition-colors ${
        isActive
          ? "bg-primary/15 ring-1 ring-inset ring-primary/30 shadow-sm"
          : hasUnread
            ? "bg-primary/5 hover:bg-primary/10"
            : "hover:bg-muted/50"
      }`}
      aria-label={`${conv.otherPartyName}${hasUnread ? `, ${conv.unreadCount} unread` : ""}`}
      aria-current={isActive ? "true" : undefined}
    >
      {(isActive || (hasUnread && !isActive)) && (
        <span
          className={`absolute left-0 top-0 h-full ${isActive ? "w-1.5 bg-primary" : "w-1 bg-primary/80"}`}
          aria-hidden
        />
      )}

      <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
        hasUnread
          ? "bg-primary/20 text-primary"
          : "bg-primary/10 text-primary"
      }`}>
        {getInitials(conv.otherPartyName)}
      </div>

      <div className="w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {hasUnread && !isActive && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
            )}
            <p
              className={`truncate text-sm ${
                hasUnread
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground"
              }`}
            >
              {conv.otherPartyName}
            </p>
          </div>
          {conv.lastMessageAt && (
            <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(conv.lastMessageAt)}</span>
          )}
        </div>
        {conv.jobTitle && (
          <p
            className="mt-0.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground"
          >
            {conv.jobTitle}
          </p>
        )}
        {conv.lastMessage && (
          <p className={`mt-0.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs ${
            hasUnread
              ? "font-medium text-foreground/80"
              : "text-muted-foreground"
          }`}>
            {conv.lastMessage}
          </p>
        )}
      </div>

      {hasUnread && (
        <span className="h-5 min-w-[20px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1 shrink-0">
          {conv.unreadCount}
        </span>
      )}
    </button>
  );
}

/* ── Chat window ────────────────────────────────────────────────────── */
function ChatWindow({
  conv,
  userId,
  userRole,
  draft,
  setDraft,
  onSend,
  onKeyDown,
  onBack,
  sending,
}: {
  conv: ConversationSummary;
  userId: string;
  userRole: "driver" | "company";
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBack: () => void;
  sending: boolean;
}) {
  const { data: messages = [], isLoading } = useMessages(conv.applicationId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of the messages container (not the page)
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <button onClick={onBack} className="md:hidden text-muted-foreground hover:text-foreground" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
          {getInitials(conv.otherPartyName)}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{conv.otherPartyName}</p>
          {conv.jobTitle && <p className="text-[11px] text-muted-foreground truncate">{conv.jobTitle}</p>}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner size="sm" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>No messages yet.</p>
            <p className="text-xs mt-1">Send the first message below.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine = msg.senderId === userId;
              const messageStatus = resolveMessageStatus(msg);
              const statusLabel = getStatusLabel(messageStatus);
              const isFailed = messageStatus === "failed_to_deliver";
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    <div
                      className={`px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-t-lg rounded-bl-lg"
                          : "bg-muted text-foreground rounded-t-lg rounded-br-lg"
                      }`}
                    >
                      {msg.body}
                    </div>
                    <p className={`text-[10px] mt-0.5 ${isMine ? "text-right" : ""} ${isFailed ? "text-destructive" : "text-muted-foreground"}`}>
                      {formatTime(msg.createdAt)}
                      {isMine ? ` - ${statusLabel}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-2">
        <Input
          id="chat-message"
          name="message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          className="flex-1"
          disabled={sending}
        />
        <Button size="icon" onClick={onSend} disabled={!draft.trim() || sending} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
