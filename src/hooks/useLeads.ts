import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Lead {
  id: string;
  source: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  state: string | null;
  yearsExp: string | null;
  isOwnerOp: boolean;
  truckYear: string | null;
  truckMake: string | null;
  truckModel: string | null;
  status: "new" | "contacted" | "hired" | "dismissed";
  syncedAt: string;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLead(row: Record<string, any>): Lead {
  return {
    id: row.id,
    source: row.source ?? "facebook",
    fullName: row.full_name,
    phone: row.phone ?? null,
    email: row.email ?? null,
    state: row.state ?? null,
    yearsExp: row.years_exp ?? null,
    isOwnerOp: row.is_owner_op ?? false,
    truckYear: row.truck_year ?? null,
    truckMake: row.truck_make ?? null,
    truckModel: row.truck_model ?? null,
    status: row.status ?? "new",
    syncedAt: row.synced_at ?? row.created_at,
    createdAt: row.created_at,
  };
}

/* ── Mock data ──────────────────────────────────────────────────────── */
const MOCK_LEADS: Lead[] = [
  { id: "mock-1",  source: "facebook", fullName: "Marcus Johnson",    phone: "(312) 555-0147", email: "marcus.j@gmail.com",       state: "IL", yearsExp: "5+",    isOwnerOp: true,  truckYear: "2021", truckMake: "Freightliner", truckModel: "Cascadia", status: "new", syncedAt: "2026-02-27T14:30:00Z", createdAt: "2026-02-27T14:30:00Z" },
  { id: "mock-2",  source: "facebook", fullName: "Robert Williams",   phone: "(713) 555-0293", email: "rwilliams@yahoo.com",      state: "TX", yearsExp: "3-5",   isOwnerOp: false, truckYear: null,   truckMake: null,           truckModel: null,       status: "new", syncedAt: "2026-02-27T13:15:00Z", createdAt: "2026-02-27T13:15:00Z" },
  { id: "mock-3",  source: "facebook", fullName: "David Martinez",    phone: "(323) 555-0418", email: "dmartinez@hotmail.com",    state: "CA", yearsExp: "1-3",   isOwnerOp: false, truckYear: null,   truckMake: null,           truckModel: null,       status: "new", syncedAt: "2026-02-27T11:45:00Z", createdAt: "2026-02-27T11:45:00Z" },
  { id: "mock-4",  source: "facebook", fullName: "James Thompson",    phone: "(614) 555-0562", email: "jthompson@gmail.com",      state: "OH", yearsExp: "5+",    isOwnerOp: true,  truckYear: "2022", truckMake: "Peterbilt",    truckModel: "579",      status: "new", syncedAt: "2026-02-27T10:20:00Z", createdAt: "2026-02-27T10:20:00Z" },
  { id: "mock-5",  source: "facebook", fullName: "Michael Brown",     phone: "(305) 555-0731", email: "mbrown@outlook.com",       state: "FL", yearsExp: "3-5",   isOwnerOp: false, truckYear: null,   truckMake: null,           truckModel: null,       status: "contacted", syncedAt: "2026-02-26T16:00:00Z", createdAt: "2026-02-26T16:00:00Z" },
  { id: "mock-6",  source: "facebook", fullName: "Christopher Davis", phone: "(404) 555-0889", email: "cdavis@gmail.com",         state: "GA", yearsExp: "less-1",isOwnerOp: false, truckYear: null,   truckMake: null,           truckModel: null,       status: "new", syncedAt: "2026-02-26T14:30:00Z", createdAt: "2026-02-26T14:30:00Z" },
  { id: "mock-7",  source: "facebook", fullName: "Anthony Wilson",    phone: "(215) 555-0156", email: "awilson@yahoo.com",        state: "PA", yearsExp: "5+",    isOwnerOp: true,  truckYear: "2020", truckMake: "Kenworth",     truckModel: "T680",     status: "new", syncedAt: "2026-02-26T12:10:00Z", createdAt: "2026-02-26T12:10:00Z" },
  { id: "mock-8",  source: "facebook", fullName: "Daniel Garcia",     phone: "(317) 555-0274", email: "dgarcia@gmail.com",        state: "IN", yearsExp: "1-3",   isOwnerOp: false, truckYear: null,   truckMake: null,           truckModel: null,       status: "new", syncedAt: "2026-02-26T09:45:00Z", createdAt: "2026-02-26T09:45:00Z" },
  { id: "mock-9",  source: "facebook", fullName: "Kevin Anderson",    phone: "(615) 555-0398", email: "kanderson@hotmail.com",    state: "TN", yearsExp: "3-5",   isOwnerOp: false, truckYear: null,   truckMake: null,           truckModel: null,       status: "new", syncedAt: "2026-02-25T17:20:00Z", createdAt: "2026-02-25T17:20:00Z" },
  { id: "mock-10", source: "facebook", fullName: "Brian Taylor",      phone: "(704) 555-0517", email: "btaylor@gmail.com",        state: "NC", yearsExp: "5+",    isOwnerOp: true,  truckYear: "2023", truckMake: "Volvo",        truckModel: "VNL 860",  status: "new", syncedAt: "2026-02-25T15:00:00Z", createdAt: "2026-02-25T15:00:00Z" },
  { id: "mock-11", source: "facebook", fullName: "Steven Moore",      phone: "(816) 555-0643", email: "smoore@yahoo.com",         state: "MO", yearsExp: "1-3",   isOwnerOp: false, truckYear: null,   truckMake: null,           truckModel: null,       status: "dismissed", syncedAt: "2026-02-25T11:30:00Z", createdAt: "2026-02-25T11:30:00Z" },
  { id: "mock-12", source: "facebook", fullName: "Jason Lee",         phone: "(602) 555-0782", email: "jlee@gmail.com",           state: "AZ", yearsExp: "3-5",   isOwnerOp: false, truckYear: null,   truckMake: null,           truckModel: null,       status: "new", syncedAt: "2026-02-24T14:15:00Z", createdAt: "2026-02-24T14:15:00Z" },
  { id: "mock-13", source: "facebook", fullName: "Thomas Clark",      phone: "(973) 555-0891", email: "tclark@outlook.com",       state: "NJ", yearsExp: "5+",    isOwnerOp: true,  truckYear: "2019", truckMake: "International",truckModel: "LT",       status: "new", syncedAt: "2026-02-24T10:00:00Z", createdAt: "2026-02-24T10:00:00Z" },
  { id: "mock-14", source: "facebook", fullName: "Ryan Harris",       phone: "(571) 555-0134", email: "rharris@gmail.com",        state: "VA", yearsExp: "less-1",isOwnerOp: false, truckYear: null,   truckMake: null,           truckModel: null,       status: "new", syncedAt: "2026-02-23T16:45:00Z", createdAt: "2026-02-23T16:45:00Z" },
  { id: "mock-15", source: "facebook", fullName: "Eric Robinson",     phone: "(313) 555-0256", email: "erobinson@yahoo.com",      state: "MI", yearsExp: "3-5",   isOwnerOp: false, truckYear: null,   truckMake: null,           truckModel: null,       status: "new", syncedAt: "2026-02-23T12:30:00Z", createdAt: "2026-02-23T12:30:00Z" },
];

/** Fetch all leads — falls back to mock data if table is empty or doesn't exist */
export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      // If table doesn't exist or is empty, return mock data
      if (error || !data || data.length === 0) {
        return MOCK_LEADS;
      }
      return data.map(rowToLead);
    },
    refetchInterval: 60_000,
  });
}

/** Update a lead's status */
export function useUpdateLeadStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { leadId: string; status: Lead["status"] }) => {
      // For mock leads, skip Supabase call
      if (params.leadId.startsWith("mock-")) return;

      const { error } = await supabase
        .from("leads")
        .update({ status: params.status })
        .eq("id", params.leadId);
      if (error) throw error;
    },
    // Optimistic update
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const prev = qc.getQueryData<Lead[]>(["leads"]);
      qc.setQueryData<Lead[]>(["leads"], (old) =>
        (old ?? []).map((l) => (l.id === vars.leadId ? { ...l, status: vars.status } : l))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["leads"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
