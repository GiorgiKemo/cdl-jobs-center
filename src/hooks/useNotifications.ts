import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToNotification(row: Record<string, any>): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata ?? {},
    read: row.read,
    createdAt: row.created_at,
  };
}

/** Recent notifications for the current user */
export function useNotifications(userId: string | undefined, limit = 30) {
  return useQuery({
    queryKey: ["notifications", userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(rowToNotification);
    },
    enabled: !!userId,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

/** Unread notification count for badge */
export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["unread-notification-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("read", false);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!userId,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

/** Mark specific notification IDs as read */
export function useMarkNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notifIds: string[]) => {
      const { error } = await supabase.rpc("mark_notifications_read", {
        p_notif_ids: notifIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });
}

/** Mark all notifications as read */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mark_all_notifications_read");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });
}

/** Delete all notifications for current user */
export function useClearAllNotifications() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("clear_all_notifications");
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      await qc.cancelQueries({ queryKey: ["unread-notification-count"] });

      const previousNotifications = qc.getQueriesData<Notification[]>({
        queryKey: ["notifications"],
      });
      const previousUnreadCounts = qc.getQueriesData<number>({
        queryKey: ["unread-notification-count"],
      });

      qc.setQueriesData<Notification[]>({ queryKey: ["notifications"] }, []);
      qc.setQueriesData<number>({ queryKey: ["unread-notification-count"] }, 0);

      return { previousNotifications, previousUnreadCounts };
    },
    onError: (_error, _vars, context) => {
      if (!context) return;

      for (const [queryKey, data] of context.previousNotifications) {
        qc.setQueryData(queryKey, data);
      }

      for (const [queryKey, data] of context.previousUnreadCounts) {
        qc.setQueryData(queryKey, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });
}
