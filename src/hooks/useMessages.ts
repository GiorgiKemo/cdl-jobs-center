import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface Message {
  id: string;
  applicationId: string;
  senderId: string;
  senderRole: "driver" | "company";
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface ConversationSummary {
  applicationId: string;
  otherPartyName: string;
  jobTitle: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMessage(row: Record<string, any>): Message {
  return {
    id: row.id,
    applicationId: row.application_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at ?? null,
  };
}

/** All conversations for a user, enriched with last message + unread count */
export function useConversations(userId: string | undefined, role: "driver" | "company") {
  return useQuery({
    queryKey: ["conversations", userId],
    queryFn: async () => {
      // 1. Get all applications for this user
      const col = role === "driver" ? "driver_id" : "company_id";
      const { data: apps, error: appErr } = await supabase
        .from("applications")
        .select("id, company_name, first_name, last_name, job_title")
        .eq(col, userId!);
      if (appErr) throw appErr;
      if (!apps || apps.length === 0) return [] as ConversationSummary[];

      const appIds = apps.map((a) => a.id);

      // 2. Get all messages for those applications
      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("application_id, sender_id, body, created_at, read_at")
        .in("application_id", appIds)
        .order("created_at", { ascending: false });
      if (msgErr) throw msgErr;

      // 3. Build summaries
      const msgsByApp = new Map<string, typeof msgs>();
      for (const m of msgs ?? []) {
        const list = msgsByApp.get(m.application_id) ?? [];
        list.push(m);
        msgsByApp.set(m.application_id, list);
      }

      const conversations: ConversationSummary[] = apps.map((app) => {
        const appMsgs = msgsByApp.get(app.id) ?? [];
        const latest = appMsgs[0] ?? null;
        const unread = appMsgs.filter((m) => m.sender_id !== userId! && !m.read_at).length;

        const otherPartyName = role === "driver"
          ? app.company_name ?? "Company"
          : `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim() || "Driver";

        return {
          applicationId: app.id,
          otherPartyName,
          jobTitle: app.job_title ?? null,
          lastMessage: latest?.body ?? null,
          lastMessageAt: latest?.created_at ?? null,
          unreadCount: unread,
        };
      });

      // Sort: conversations with messages first (newest), then no-message ones
      conversations.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) return b.lastMessageAt.localeCompare(a.lastMessageAt);
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return 0;
      });

      return conversations;
    },
    enabled: !!userId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

/** Message thread for a single application */
export function useMessages(applicationId: string | null) {
  return useQuery({
    queryKey: ["messages", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("application_id", applicationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToMessage);
    },
    enabled: !!applicationId,
    refetchInterval: 5_000,
  });
}

/** Send a message */
export function useSendMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      applicationId: string;
      senderId: string;
      senderRole: "driver" | "company";
      body: string;
    }) => {
      const { error } = await supabase.from("messages").insert({
        application_id: params.applicationId,
        sender_id: params.senderId,
        sender_role: params.senderRole,
        body: params.body,
      });
      if (error) throw error;
    },
    // Optimistic update: show message instantly
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["messages", vars.applicationId] });
      const prev = qc.getQueryData<Message[]>(["messages", vars.applicationId]);
      const optimistic: Message = {
        id: `temp-${Date.now()}`,
        applicationId: vars.applicationId,
        senderId: vars.senderId,
        senderRole: vars.senderRole,
        body: vars.body,
        createdAt: new Date().toISOString(),
        readAt: null,
      };
      qc.setQueryData<Message[]>(["messages", vars.applicationId], (old) => [...(old ?? []), optimistic]);
      return { prev };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["messages", vars.applicationId], ctx.prev);
      toast.error("Failed to send message. Please try again.");
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.applicationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Mark all incoming messages in a conversation as read */
export function useMarkRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { applicationId: string; userId: string }) => {
      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("application_id", params.applicationId)
        .neq("sender_id", params.userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.applicationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["unread-messages-count"] });
    },
  });
}

/** Total unread message count for navbar badge */
export function useUnreadCount(userId: string | undefined, role: "driver" | "company" | undefined) {
  return useQuery({
    queryKey: ["unread-messages-count", userId],
    queryFn: async () => {
      if (role !== "driver" && role !== "company") return 0;
      // 1. Get application IDs belonging to this user
      const col = role === "driver" ? "driver_id" : "company_id";
      const { data: apps, error: appErr } = await supabase
        .from("applications")
        .select("id")
        .eq(col, userId!);
      if (appErr || !apps || apps.length === 0) return 0;

      const appIds = apps.map((a) => a.id);

      // 2. Count unread messages only within those applications
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("application_id", appIds)
        .neq("sender_id", userId!)
        .is("read_at", null);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!userId && !!role,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
