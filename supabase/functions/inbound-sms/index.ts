/**
 * inbound-sms — Twilio inbound webhook for lead SMS replies.
 *
 * Twilio posts application/x-www-form-urlencoded when a reply arrives on
 * the platform phone number. We match by the sender's phone number against
 * leads, then route to the company that most recently messaged that lead.
 *
 * Set this function's URL as the "A MESSAGE COMES IN" webhook on your
 * Twilio phone number (HTTP POST).
 *
 * No auth header — Twilio calls this publicly.
 * Responds with empty TwiML so Twilio doesn't send an auto-reply.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/** Normalize a phone number to E.164 for consistent DB matching. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(TWIML_EMPTY, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  try {
    const form = await req.formData();
    const from   = form.get("From")?.toString() ?? "";
    const to     = form.get("To")?.toString() ?? "";
    const body   = form.get("Body")?.toString() ?? "";

    if (!from || !body) {
      return new Response(TWIML_EMPTY, { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Normalize the sender number and try both raw and normalized forms
    const fromNorm = normalizePhone(from);

    // Find the lead by phone (try exact match first, then normalized)
    let leadId: string | null = null;

    const { data: leads } = await supabase
      .from("leads")
      .select("id, phone")
      .or(`phone.eq.${from},phone.eq.${fromNorm}`);

    if (leads && leads.length > 0) {
      // If multiple matches, prefer exact
      const exact = leads.find((l) => l.phone === from || l.phone === fromNorm);
      leadId = (exact ?? leads[0]).id;
    }

    if (!leadId) {
      console.log(`inbound-sms: no lead found for phone ${from}`);
      return new Response(TWIML_EMPTY, { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    // Find the company that most recently sent an outbound SMS to this lead
    const { data: lastMsg } = await supabase
      .from("lead_messages")
      .select("company_id")
      .eq("lead_id", leadId)
      .eq("channel", "sms")
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastMsg?.company_id) {
      console.log(`inbound-sms: no prior outbound SMS for lead ${leadId}, ignoring`);
      return new Response(TWIML_EMPTY, { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    const { error } = await supabase.from("lead_messages").insert({
      company_id: lastMsg.company_id,
      lead_id:    leadId,
      direction:  "inbound",
      channel:    "sms",
      body,
      from_addr:  from,
      to_addr:    to,
      status:     "received",
    });

    if (error) {
      console.error("inbound-sms: DB insert error:", error.message);
    } else {
      console.log(`inbound-sms: stored reply from ${from} → company ${lastMsg.company_id}, lead ${leadId}`);
    }

    return new Response(TWIML_EMPTY, { status: 200, headers: { "Content-Type": "text/xml" } });
  } catch (err) {
    console.error("inbound-sms error:", err instanceof Error ? err.message : err);
    // Always return 200 to Twilio so it doesn't retry
    return new Response(TWIML_EMPTY, { status: 200, headers: { "Content-Type": "text/xml" } });
  }
});
