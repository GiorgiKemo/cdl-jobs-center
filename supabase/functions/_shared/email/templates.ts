/**
 * Branded HTML email templates for CDL Jobs Center notifications.
 * Uses inline styles for maximum email client compatibility.
 */

const BRAND_COLOR = "#2563eb"; // primary blue
const ACCENT_GREEN = "#16a34a";
const BG_COLOR = "#f8fafc";
const CARD_BG = "#ffffff";
const TEXT_COLOR = "#1e293b";
const MUTED_COLOR = "#64748b";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://cdl-jobs-center.vercel.app";

interface EmailTemplateParams {
  title: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  preferencesUrl?: string;
}

export function buildNotificationEmail({
  title,
  bodyHtml,
  ctaText,
  ctaUrl,
  preferencesUrl,
}: EmailTemplateParams): string {
  const ctaBlock = ctaText && ctaUrl
    ? `<tr>
        <td style="padding: 24px 0 0 0;">
          <a href="${escapeHtml(ctaUrl)}"
             style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff;
                    font-size: 14px; font-weight: 600; text-decoration: none;
                    padding: 12px 24px; border-radius: 6px;">
            ${escapeHtml(ctaText)}
          </a>
        </td>
      </tr>`
    : "";

  const unsubBlock = preferencesUrl
    ? `<p style="margin: 0; font-size: 12px;">
        <a href="${escapeHtml(preferencesUrl)}" style="color: ${MUTED_COLOR}; text-decoration: underline;">
          Manage notification preferences
        </a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: ${BG_COLOR}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BG_COLOR};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 24px; text-align: center;">
              <a href="${SITE_URL}" style="font-size: 20px; font-weight: 700; color: ${BRAND_COLOR}; text-decoration: none;">
                CDL Jobs Center
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color: ${CARD_BG}; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 18px; font-weight: 600; color: ${TEXT_COLOR}; padding-bottom: 12px;">
                    ${escapeHtml(title)}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 14px; line-height: 1.6; color: ${TEXT_COLOR};">
                    ${bodyHtml}
                  </td>
                </tr>
                ${ctaBlock}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center; color: ${MUTED_COLOR}; font-size: 12px;">
              <p style="margin: 0 0 4px 0;">&copy; ${new Date().getFullYear()} CDL Jobs Center</p>
              <p style="margin: 0 0 4px 0;">1975 E Sunrise Blvd, Fort Lauderdale, FL 33304</p>
              ${unsubBlock}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Map notification type to CTA text + link path building */
export function getCtaForType(
  type: string,
  metadata: Record<string, unknown>
): { ctaText: string; ctaUrl: string } {
  const link = (metadata.link as string) || "";
  const fullUrl = link ? `${SITE_URL}${link}` : SITE_URL;

  const ctaMap: Record<string, string> = {
    new_application: "Review Application",
    stage_change: "Check Your Status",
    new_message: "Read & Reply",
    new_match: "View Match",
    new_lead: "View Lead",
    subscription_event: "View Subscription",
    profile_reminder: "Complete Profile",
    weekly_digest: "View Dashboard",
    welcome: "Get Started",
    verification_update: (metadata.decision as string) === "approved"
      ? "View Your Dashboard"
      : "Resubmit Verification",
  };

  return {
    ctaText: ctaMap[type] || "View on CDL Jobs Center",
    ctaUrl: fullUrl,
  };
}

// ── Rich email body builders per notification type ──────────────

const p = (text: string) =>
  `<p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: ${TEXT_COLOR};">${text}</p>`;
const bold = (text: string) =>
  `<strong style="color: ${TEXT_COLOR};">${text}</strong>`;
const badge = (text: string, color: string) =>
  `<span style="display: inline-block; background-color: ${color}; color: #ffffff; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 12px;">${escapeHtml(text)}</span>`;
const divider = `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">`;

/**
 * Build rich, descriptive HTML body based on notification type + metadata.
 * Falls back to plain escaped text for unknown types.
 */
export function buildRichBody(
  type: string,
  title: string,
  body: string,
  metadata: Record<string, unknown>
): string {
  const m = metadata;

  switch (type) {
    case "new_application": {
      const driver = escapeHtml((m.driver_name as string) || "A driver");
      const job = escapeHtml((m.job_title as string) || "a position");
      return [
        p(`${bold(driver)} just submitted an application for ${bold(job)}.`),
        p("Here's what to do next:"),
        `<ul style="margin: 0 0 12px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: ${TEXT_COLOR};">
          <li>Review the driver's qualifications and experience</li>
          <li>Move the application through your hiring pipeline</li>
          <li>Send the driver a message if you'd like more information</li>
        </ul>`,
        p(`The sooner you respond, the more likely you are to secure top talent. Don't let this one slip away!`),
      ].join("");
    }

    case "stage_change": {
      const job = escapeHtml((m.job_title as string) || "a position");
      const company = escapeHtml((m.company_name as string) || "a company");
      const newStage = (m.new_stage as string) || "";
      const oldStage = (m.old_stage as string) || "";

      const stageColors: Record<string, string> = {
        New: "#6b7280",
        Reviewing: BRAND_COLOR,
        Interview: "#7c3aed",
        Hired: ACCENT_GREEN,
        Rejected: "#dc2626",
      };
      const stageBadge = badge(newStage, stageColors[newStage] || BRAND_COLOR);

      let encouragement = "";
      if (newStage === "Reviewing") {
        encouragement = "The hiring team is actively reviewing your qualifications. Hang tight!";
      } else if (newStage === "Interview") {
        encouragement = "Great news! The company is interested in speaking with you. Check your messages for details.";
      } else if (newStage === "Hired") {
        encouragement = "Congratulations! You've been selected for this position. Check your messages for next steps.";
      } else if (newStage === "Rejected") {
        encouragement = "Unfortunately, the company has decided to move forward with other candidates. Don't be discouraged — new jobs are posted daily.";
      }

      return [
        p(`Your application for ${bold(job)} at ${bold(company)} has been updated.`),
        divider,
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 12px 0;">
          <tr>
            <td style="font-size: 13px; color: ${MUTED_COLOR}; padding-right: 8px;">Previous status:</td>
            <td style="font-size: 13px; color: ${TEXT_COLOR};">${escapeHtml(oldStage)}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: ${MUTED_COLOR}; padding-right: 8px; padding-top: 4px;">New status:</td>
            <td style="padding-top: 4px;">${stageBadge}</td>
          </tr>
        </table>`,
        divider,
        encouragement ? p(encouragement) : "",
      ].join("");
    }

    case "new_message": {
      const sender = escapeHtml((m.sender_name as string) || "Someone");
      const preview = escapeHtml(body || "");

      return [
        p(`You have a new message from ${bold(sender)}.`),
        preview
          ? `<div style="background-color: #f1f5f9; border-left: 3px solid ${BRAND_COLOR}; padding: 12px 16px; margin: 0 0 12px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; font-size: 13px; color: ${MUTED_COLOR}; font-style: italic;">"${preview}"</p>
            </div>`
          : "",
        p("Reply promptly to keep the conversation going and move the hiring process forward."),
      ].join("");
    }

    case "welcome": {
      const isDriver = (m.link as string)?.includes("driver");

      if (isDriver) {
        return [
          p("Welcome aboard! Your CDL Jobs Center account is ready to go."),
          p("Here's how to get started:"),
          `<ol style="margin: 0 0 12px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: ${TEXT_COLOR};">
            <li>${bold("Complete your driver profile")} — add your CDL class, endorsements, and experience so our AI can match you with the best jobs</li>
            <li>${bold("Browse available jobs")} — hundreds of CDL positions are posted from companies across the country</li>
            <li>${bold("Apply with one click")} — once your profile is set up, applying is fast and easy</li>
          </ol>`,
          p("The more complete your profile, the better your AI match scores will be. Companies are actively looking for drivers like you!"),
        ].join("");
      }

      return [
        p("Welcome to CDL Jobs Center! Your company account is ready."),
        p("Here's how to get started:"),
        `<ol style="margin: 0 0 12px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: ${TEXT_COLOR};">
          <li>${bold("Post your first job")} — describe the position and our AI will start matching qualified CDL drivers</li>
          <li>${bold("Set up your company profile")} — add your logo, about section, and contact info to build trust with drivers</li>
          <li>${bold("Review incoming applications")} — manage your hiring pipeline with our built-in tools</li>
        </ol>`,
        p("Thousands of qualified CDL drivers are searching for their next opportunity. Your first applicants could arrive within hours of posting!"),
      ].join("");
    }

    case "verification_update": {
      const decision = (m.decision as string) || "";
      const reason = escapeHtml((m.rejection_reason as string) || "");

      if (decision === "approved") {
        return [
          p(`Great news! ${bold("Your company has been verified.")} &#9989;`),
          divider,
          p("Here's what this means for your company:"),
          `<ul style="margin: 0 0 12px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: ${TEXT_COLOR};">
            <li>A ${bold("verified badge")} is now visible on your profile and job listings</li>
            <li>Drivers will see increased ${bold("trust signals")} when viewing your company</li>
            <li>Your company ${bold("stands out")} in search results</li>
          </ul>`,
          p("Keep posting quality jobs and engaging with applicants to make the most of your verified status!"),
        ].join("");
      }

      return [
        p("Your verification request was ${bold('not approved')} at this time."),
        reason
          ? `<div style="background-color: #fef2f2; border-left: 3px solid #dc2626; padding: 12px 16px; margin: 0 0 12px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; font-size: 13px; color: ${TEXT_COLOR};"><strong>Reason:</strong> ${reason}</p>
            </div>`
          : "",
        divider,
        p("You can submit a new verification request with updated information. Common reasons for rejection include incomplete documentation or mismatched business details."),
        p("If you believe this was a mistake, please update your information and try again."),
      ].join("");
    }

    default:
      return p(escapeHtml(body));
  }
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
