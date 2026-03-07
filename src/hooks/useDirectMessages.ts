import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DirectMessage {
  id: string;
  companyId: string;
  driverId: string;
  senderRole: "company" | "driver";
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface DirectThread {
  companyId: string;
  companyName: string;
  messages: DirectMessage[];
  lastMessage: DirectMessage;
  unreadCount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDM(row: Record<string, any>): DirectMessage {
  return {
    id: row.id,
    companyId: row.company_id,
    driverId: row.driver_id,
    senderRole: row.sender_role,
    body: row.body,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

/** Single thread between one company and one driver (company side) */
export function useDirectMessages(companyId: string | null, driverId: string | null) {
  return useQuery({
    queryKey: ["direct-messages", companyId, driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("company_id", companyId!)
        .eq("driver_id", driverId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToDM);
    },
    enabled: !!companyId && !!driverId,
    refetchInterval: 10_000,
  });
}

/** Send a direct message (company or driver) */
export function useSendDirectMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      companyId: string;
      driverId: string;
      senderRole: "company" | "driver";
      body: string;
    }) => {
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          company_id: params.companyId,
          driver_id: params.driverId,
          sender_role: params.senderRole,
          body: params.body,
        })
        .select("*")
        .single();
      if (error) throw error;
      return rowToDM(data as Record<string, unknown>);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["direct-messages", vars.companyId, vars.driverId] });
      qc.invalidateQueries({ queryKey: ["driver-direct-threads", vars.driverId] });
    },
  });
}

/** Mark the other side's messages as read */
export function useMarkDirectRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      companyId: string;
      driverId: string;
      readerRole: "company" | "driver";
    }) => {
      const senderRole = params.readerRole === "company" ? "driver" : "company";
      const { error } = await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("company_id", params.companyId)
        .eq("driver_id", params.driverId)
        .eq("sender_role", senderRole)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["direct-messages", vars.companyId, vars.driverId] });
      qc.invalidateQueries({ queryKey: ["driver-direct-threads", vars.driverId] });
    },
  });
}

/** All direct message threads for a driver (driver dashboard) */
export function useDriverDirectThreads(driverId: string | null) {
  return useQuery({
    queryKey: ["driver-direct-threads", driverId],
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("driver_id", driverId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!messages || messages.length === 0) return [] as DirectThread[];

      const companyIds = [...new Set(messages.map((m) => m.company_id))];
      const { data: companies } = await supabase
        .from("company_profiles")
        .select("id, company_name")
        .in("id", companyIds);
      const nameMap = new Map<string, string>();
      for (const c of companies ?? []) nameMap.set(c.id, c.company_name ?? "Company");

      const byCompany = new Map<string, DirectMessage[]>();
      for (const msg of messages.map(rowToDM)) {
        const list = byCompany.get(msg.companyId) ?? [];
        list.push(msg);
        byCompany.set(msg.companyId, list);
      }

      const threads: DirectThread[] = [];
      for (const [companyId, msgs] of byCompany) {
        threads.push({
          companyId,
          companyName: nameMap.get(companyId) ?? "Company",
          messages: [...msgs].reverse(), // oldest first for display
          lastMessage: msgs[0],
          unreadCount: msgs.filter((m) => m.senderRole === "company" && !m.readAt).length,
        });
      }
      return threads.sort((a, b) =>
        b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt),
      );
    },
    enabled: !!driverId,
    refetchInterval: 30_000,
  });
}
