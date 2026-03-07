import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Sheet config — stored in LEAD_SHEETS secret as JSON array */
interface SheetConfig {
  id: string;
  tab: string;
  lead_type: "owner_operator" | "company_driver";
  label: string;
}

interface LeadRecord {
  sheet_row_id: string;
  source_sheet: string;
  source: string;
  lead_type: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  state: string | null;
  years_exp: string | null;
  is_owner_op: boolean;
  truck_year: string | null;
  truck_make: string | null;
  truck_model: string | null;
  date_submitted: string | null;
  violations: string | null;
  availability: string | null;
  notes: string | null;
  synced_at: string;
  deleted_at: null; // Always null on sync — reactivates any previously soft-deleted rows
}

/**
 * Stable content-hash row ID — immune to Google Sheets row insertion/deletion.
 * Uses two independent FNV-1a 32-bit hashes for 64-bit coverage.
 */
function contentRowId(name: string, phone: string | null, email: string | null): string {
  const s = `${name.toLowerCase().trim()}|${(phone ?? "").replace(/\D/g, "")}|${(email ?? "").toLowerCase().trim()}`;
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x45237987 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c << 1 | c >> 7), 0x01000193) >>> 0;
  }
  return `h${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

function headerToField(h: string): string | null {
  const lc = h.toLowerCase().trim();
  if (lc === "name" || lc === "full name") return "full_name";
  if (lc.includes("phone")) return "phone";
  if (lc === "email") return "email";
  if (lc === "state") return "state";
  if (lc.includes("experience") || lc.includes("years of exp")) return "years_exp";
  if (lc.includes("truck year") || lc === "year of truck?") return "truck_year";
  if (lc.includes("model truck") || lc.includes("truck make")) return "truck_model";
  if (lc.includes("owner operator")) return "is_owner_op";
  if (lc.includes("violation")) return "violations";
  if (lc.includes("when can you start") || lc.includes("availability")) return "availability";
  if (lc.includes("date created") || lc.includes("date submitted")) return "date_submitted";
  if (lc === "notes") return "notes";
  return null;
}

function parseISODate(val: string): string | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch { /* ignore */ }
  return null;
}

async function fetchSheet(
  apiKey: string,
  config: SheetConfig,
  now: string,
): Promise<{ records: LeadRecord[]; errors: string[]; fetchOk: boolean }> {
  const range = encodeURIComponent(`${config.tab}!A1:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.id}/values/${range}?key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    return { records: [], errors: [`${config.label}: Sheets API ${res.status} — ${errText}`], fetchOk: false };
  }

  const data = await res.json();
  const rows: string[][] = data.values ?? [];
  if (rows.length < 2) {
    return { records: [], errors: [], fetchOk: true };
  }

  const headers = rows[0];
  const colMap: Record<number, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const field = headerToField(headers[i]);
    if (field) colMap[i] = field;
  }

  const sourceSheet = `${config.id}::${config.tab}`;
  const records: LeadRecord[] = [];
  const errors: string[] = [];

  const nameColIdx = Number(Object.entries(colMap).find(([, f]) => f === "full_name")?.[0] ?? -1);
  const dateColIdx = Number(Object.entries(colMap).find(([, f]) => f === "date_submitted")?.[0] ?? -1);
  const hasDateCol = dateColIdx >= 0 && dateColIdx < nameColIdx;

  for (let r = 1; r < rows.length; r++) {
    let vals = rows[r];

    if (hasDateCol && vals.length > 0) {
      const firstCell = (vals[dateColIdx] ?? "").trim();
      const looksLikeDate = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(firstCell);
      if (!looksLikeDate && firstCell) {
        vals = [...vals];
        vals.splice(dateColIdx, 0, "");
      }
    }

    const fields: Record<string, string> = {};
    for (const [colIdx, fieldName] of Object.entries(colMap)) {
      const v = (vals[Number(colIdx)] ?? "").trim();
      if (v) fields[fieldName] = v;
    }

    const fullName = fields.full_name;
    if (!fullName) continue;

    if (/^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i.test(fullName)) {
      continue;
    }

    const ownerOpRaw = (fields.is_owner_op ?? "").toLowerCase();
    const isOwnerOp = config.lead_type === "owner_operator" ||
      ownerOpRaw === "yes" || ownerOpRaw === "true" || ownerOpRaw === "1";

    records.push({
      sheet_row_id: contentRowId(fullName, fields.phone || null, fields.email || null),
      source_sheet: sourceSheet,
      source: "google-sheets",
      lead_type: config.lead_type,
      full_name: fullName,
      phone: fields.phone || null,
      email: fields.email || null,
      state: fields.state || null,
      years_exp: fields.years_exp || null,
      is_owner_op: isOwnerOp,
      truck_year: fields.truck_year || null,
      truck_make: null,
      truck_model: fields.truck_model || null,
      date_submitted: parseISODate(fields.date_submitted ?? ""),
      violations: fields.violations || null,
      availability: fields.availability || null,
      notes: fields.notes || null,
      synced_at: now,
      deleted_at: null,
    });
  }

  return { records, errors, fetchOk: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const sheetsApiKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    const leadSheetsRaw = Deno.env.get("LEAD_SHEETS");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!sheetsApiKey || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing required env vars" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth: allow service role key, pg_cron (no header), or valid company/admin user
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    let callerCompanyId: string | null = null;

    if (token && token !== serviceRoleKey) {
      // Token provided but not service role — validate as user JWT
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile || (profile.role !== "admin" && profile.role !== "company")) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (profile.role === "company") {
        callerCompanyId = user.id;
      }
    }
    // else: service role key or no auth header (pg_cron) → full access

    // Parse sheet configs
    let sheetConfigs: SheetConfig[] = [];
    if (leadSheetsRaw) {
      try {
        sheetConfigs = JSON.parse(leadSheetsRaw);
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid LEAD_SHEETS JSON" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (sheetConfigs.length === 0) {
      const legacyId = Deno.env.get("GOOGLE_SHEET_ID");
      if (legacyId) {
        sheetConfigs = [{
          id: legacyId,
          tab: "Sheet1",
          lead_type: "owner_operator",
          label: "Legacy Sheet",
        }];
      }
    }

    if (sheetConfigs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No sheet configs found (set LEAD_SHEETS secret)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Record sync start time — rows with synced_at < syncStart after upserts are stale (deleted from sheet)
    const syncStart = new Date().toISOString();

    const results = await Promise.all(
      sheetConfigs.map((cfg) => fetchSheet(sheetsApiKey, cfg, syncStart))
    );

    const allRecords: LeadRecord[] = [];
    const allErrors: string[] = [];
    const successfulSheets = new Set<string>();

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      allRecords.push(...r.records);
      allErrors.push(...r.errors);
      if (r.fetchOk) {
        successfulSheets.add(`${sheetConfigs[i].id}::${sheetConfigs[i].tab}`);
      }
    }

    if (allRecords.length === 0 && successfulSheets.size === 0) {
      return new Response(
        JSON.stringify({ synced: 0, new: 0, updated: 0, errors: allErrors, message: "No valid rows found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Tag leads with company_id if called by a company user
    if (callerCompanyId) {
      for (const rec of allRecords) {
        (rec as Record<string, unknown>).company_id = callerCompanyId;
      }
    }

    // Count existing records for new vs updated tracking
    const BATCH_SIZE = 50;
    const BATCH_QUERY = 200;
    let totalNew = 0;
    let totalUpdated = 0;

    const existingKeys = new Set<string>();
    for (let i = 0; i < allRecords.length; i += BATCH_QUERY) {
      const batch = allRecords.slice(i, i + BATCH_QUERY);
      const sourceSheets = [...new Set(batch.map((r) => r.source_sheet))];
      const rowIds = batch.map((r) => r.sheet_row_id);

      const { data: existing } = await supabase
        .from("leads")
        .select("source_sheet, sheet_row_id")
        .in("source_sheet", sourceSheets)
        .in("sheet_row_id", rowIds)
        .is("deleted_at", null);

      if (existing) {
        for (const row of existing) {
          existingKeys.add(`${row.source_sheet}||${row.sheet_row_id}`);
        }
      }
    }

    // Upsert in batches — ignoreDuplicates:false updates existing rows (incl. resets deleted_at to null)
    for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
      const batch = allRecords.slice(i, i + BATCH_SIZE);

      const { error: upsertErr } = await supabase.from("leads").upsert(batch, {
        onConflict: "source_sheet,sheet_row_id",
        ignoreDuplicates: false,
      });

      if (upsertErr) {
        allErrors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertErr.message}`);
        continue;
      }

      for (const rec of batch) {
        const key = `${rec.source_sheet}||${rec.sheet_row_id}`;
        if (existingKeys.has(key)) {
          totalUpdated++;
        } else {
          totalNew++;
        }
      }
    }

    // Soft-delete leads that were not present in this sync (removed from Google Sheets)
    // Only for sheets that fetched without errors, and only if we got records from them
    let totalDeleted = 0;
    for (const sourceSheet of successfulSheets) {
      const sheetRecords = allRecords.filter((r) => r.source_sheet === sourceSheet);
      // Safety: don't mass-delete if the sheet returned 0 records (might be a fetch fluke)
      if (sheetRecords.length === 0) continue;

      const { data: deletedRows } = await supabase
        .from("leads")
        .update({ deleted_at: syncStart })
        .eq("source_sheet", sourceSheet)
        .is("deleted_at", null)
        .lt("synced_at", syncStart)
        .select("id");

      totalDeleted += (deletedRows?.length ?? 0);
    }

    console.log(`Sync complete: ${totalNew} new, ${totalUpdated} updated, ${totalDeleted} soft-deleted, ${allErrors.length} errors`);

    // Notify company user if they triggered the sync manually and got new leads
    if (callerCompanyId && totalNew > 0) {
      await supabase.rpc("notify_user", {
        p_user_id: callerCompanyId,
        p_type: "new_lead",
        p_title: "New Leads Synced",
        p_body: `${totalNew} new lead${totalNew === 1 ? "" : "s"} synced from Facebook ads`,
        p_metadata: { link: "/dashboard?tab=leads", new_count: totalNew },
      });
    }

    return new Response(
      JSON.stringify({
        synced: totalNew + totalUpdated,
        new: totalNew,
        updated: totalUpdated,
        deleted: totalDeleted,
        errors: allErrors,
        sheets: sheetConfigs.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
