import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SheetRow {
  fullName: string;
  phone: string;
  email: string;
  state: string;
  yearsExp: string;
  isOwnerOp: boolean;
  truckYear: string;
  truckMake: string;
  truckModel: string;
}

interface LeadRecord {
  sheet_row_id: string;
  source: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  state: string | null;
  years_exp: string | null;
  is_owner_op: boolean;
  truck_year: string | null;
  truck_make: string | null;
  truck_model: string | null;
  synced_at: string;
  company_id: string;
}

function parseRow(values: string[], rowIndex: number): { sheetRowId: string; data: SheetRow } | null {
  const fullName = (values[0] ?? "").trim();
  if (!fullName) return null;

  const ownerOpRaw = (values[5] ?? "").trim().toLowerCase();
  const isOwnerOp = ownerOpRaw === "yes" || ownerOpRaw === "true" || ownerOpRaw === "1";

  return {
    sheetRowId: `row-${rowIndex}`,
    data: {
      fullName,
      phone: (values[1] ?? "").trim(),
      email: (values[2] ?? "").trim(),
      state: (values[3] ?? "").trim(),
      yearsExp: (values[4] ?? "").trim(),
      isOwnerOp,
      truckYear: isOwnerOp ? (values[6] ?? "").trim() : "",
      truckMake: isOwnerOp ? (values[7] ?? "").trim() : "",
      truckModel: isOwnerOp ? (values[8] ?? "").trim() : "",
    },
  };
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
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!sheetsApiKey || !sheetId || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing required env vars for sync-leads function" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile || profile.role !== "company") {
      return new Response(JSON.stringify({ error: "Only company accounts can sync leads" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sheetRange = "Sheet1!A2:I";
    try {
      const body = await req.json();
      if (body?.range) sheetRange = body.range;
    } catch {
      // No body or invalid JSON, use default range.
    }

    const sheetsUrl =
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetRange)}?key=${sheetsApiKey}`;

    const sheetsRes = await fetch(sheetsUrl);
    if (!sheetsRes.ok) {
      const errText = await sheetsRes.text();
      return new Response(
        JSON.stringify({ error: `Google Sheets API error: ${sheetsRes.status}`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sheetsData = await sheetsRes.json();
    const rows: string[][] = sheetsData.values ?? [];

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, new: 0, updated: 0, errors: [], message: "No data rows found in sheet" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const errors: string[] = [];
    const records: LeadRecord[] = [];

    for (let i = 0; i < rows.length; i++) {
      const parsed = parseRow(rows[i], i + 2);
      if (!parsed) {
        if (rows[i].some((v) => v.trim())) {
          errors.push(`Row ${i + 2}: missing full name, skipped`);
        }
        continue;
      }

      records.push({
        sheet_row_id: parsed.sheetRowId,
        source: "google-sheets",
        full_name: parsed.data.fullName,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        state: parsed.data.state || null,
        years_exp: parsed.data.yearsExp || null,
        is_owner_op: parsed.data.isOwnerOp,
        truck_year: parsed.data.truckYear || null,
        truck_make: parsed.data.truckMake || null,
        truck_model: parsed.data.truckModel || null,
        synced_at: new Date().toISOString(),
        company_id: user.id,
      });
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, new: 0, updated: 0, errors, message: "No valid rows to sync" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const incomingIds = records.map((r) => r.sheet_row_id);
    const existingIds = new Set<string>();
    const { data: existingRows, error: existingErr } = await supabase
      .from("leads")
      .select("sheet_row_id")
      .in("sheet_row_id", incomingIds)
      .eq("company_id", user.id);
    if (existingErr) {
      return new Response(JSON.stringify({ error: existingErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingRows) {
      for (const row of existingRows) {
        if (row.sheet_row_id) existingIds.add(row.sheet_row_id);
      }
    }

    const BATCH_SIZE = 50;
    let totalNew = 0;
    let totalUpdated = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      const { error: upsertErr } = await supabase.from("leads").upsert(batch, {
        onConflict: "company_id,sheet_row_id",
        ignoreDuplicates: false,
      });

      if (upsertErr) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertErr.message ?? "Upsert failed"}`);
        continue;
      }

      for (const rec of batch) {
        if (existingIds.has(rec.sheet_row_id)) {
          totalUpdated++;
        } else {
          totalNew++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        synced: totalNew + totalUpdated,
        new: totalNew,
        updated: totalUpdated,
        errors,
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
