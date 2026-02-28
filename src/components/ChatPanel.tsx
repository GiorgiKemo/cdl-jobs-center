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
} from "@/hooks/useMessages";

interface ChatPanelProps {
  userId: string;
  userRole: "driver" | "company";
  userName: string;
  initialApplicationId?: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ChatPanel({ userId, userRole, userName, initialApplicationId }: ChatPanelProps) {
  const { data: conversations = [], isLoading } = useConversations(userId, userRole);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(initialApplicationId ?? null);
  const [draft, setDraft] = useState("");
  const sendMessage = useSendMessage();
  const markRead = useMarkRead();

  // Pre-select conversation from prop
  useEffect(() => {
    if (initialApplicationId) setSelectedAppId(initialApplicationId);
  }, [initialApplicationId]);

  const selected = conversations.find((c) => c.applicationId === selectedAppId) ?? null;

  // Mark messages as read when opening a conversation
  useEffect(() => {
    if (selectedAppId && selected && selected.unreadCount > 0) {
      markRead.mutate({ applicationId: selectedAppId, userId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppId]);

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

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-12 text-sm">Loading conversations...</div>;
  }

  // Mobile: show chat window if a conversation is selected
  const showList = !selectedAppId;

  return (
    <div className="border border-border bg-card overflow-hidden" style={{ height: "calc(100vh - 320px)", minHeight: 400 }}>
      <div className="flex h-full">
        {/* Conversation list */}
        <div className={`w-full md:w-80 md:shrink-0 border-r border-border flex flex-col ${!showList ? "hidden md:flex" : "flex"}`}>
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm">Messages</p>
          </div>
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
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
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border transition-colors ${
        isActive ? "bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
        {getInitials(conv.otherPartyName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">{conv.otherPartyName}</p>
          {conv.lastMessageAt && (
            <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(conv.lastMessageAt)}</span>
          )}
        </div>
        {conv.jobTitle && (
          <p className="text-[11px] text-muted-foreground truncate">{conv.jobTitle}</p>
        )}
        {conv.lastMessage && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
        )}
      </div>
      {conv.unreadCount > 0 && (
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
        <button onClick={onBack} className="md:hidden text-muted-foreground hover:text-foreground">
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
          <p className="text-center text-sm text-muted-foreground py-8">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>No messages yet.</p>
            <p className="text-xs mt-1">Send the first message below.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine = msg.senderId === userId;
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
                    <p className={`text-[10px] text-muted-foreground mt-0.5 ${isMine ? "text-right" : ""}`}>
                      {formatTime(msg.createdAt)}
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
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          className="flex-1"
          disabled={sending}
        />
        <Button size="icon" onClick={onSend} disabled={!draft.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
