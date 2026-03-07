/**
 * inbound-email — Mailgun inbound webhook for lead email replies.
 *
 * Mailgun posts multipart/form-data when a reply arrives at:
 *   reply+{companyIdHex}_{leadIdHex}@{MAILGUN_DOMAIN}
 *
 * Set up a Mailgun Inbound Route that matches:
 *   match_recipient("reply+.*@yourdomain.com")
 * and forwards to this function's URL.
 *
 * No auth header — Mailgun calls this publicly. We verify the reply-to
 * address format as implicit validation.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Convert 32-char hex string back to UUID format */
function hexToUuid(hex: string): string {
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let recipient = "";
    let sender = "";
    let subject = "";
    let bodyText = "";

    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      recipient = form.get("recipient")?.toString() ?? "";
      sender    = form.get("sender")?.toString() ?? "";
      subject   = form.get("subject")?.toString() ?? "";
      bodyText  = form.get("body-html")?.toString()
        ?? form.get("stripped-html")?.toString()
        ?? form.get("body-plain")?.toString()
        ?? form.get("stripped-text")?.toString()
        ?? "";
    } else {
      // JSON fallback
      const data = await req.json();
      recipient = data.recipient ?? "";
      sender    = data.sender ?? "";
      subject   = data.subject ?? "";
      bodyText  = data["body-html"] ?? data["body-plain"] ?? "";
    }

    if (!recipient || !bodyText) {
      return new Response("OK", { status: 200 });
    }

    // Parse reply+{32hex}_{32hex}@domain
    const match = recipient.match(/reply\+([a-f0-9]{32})_([a-f0-9]{32})@/i);
    if (!match) {
      console.log("inbound-email: not a reply address, ignoring:", recipient);
      return new Response("OK", { status: 200 });
    }

    const companyId = hexToUuid(match[1]);
    const leadId    = hexToUuid(match[2]);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("lead_messages").insert({
      company_id: companyId,
      lead_id:    leadId,
      direction:  "inbound",
      channel:    "email",
      subject:    subject || "(no subject)",
      body:       bodyText,
      from_addr:  sender,
      to_addr:    recipient,
      status:     "received",
    });

    if (error) {
      console.error("inbound-email: DB insert error:", error.message);
    } else {
      console.log(`inbound-email: stored reply from ${sender} → company ${companyId}, lead ${leadId}`);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("inbound-email error:", err instanceof Error ? err.message : err);
    // Always return 200 to Mailgun so it doesn't retry
    return new Response("OK", { status: 200 });
  }
});
