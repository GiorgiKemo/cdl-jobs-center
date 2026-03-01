/**
 * Branded HTML email templates for CDL Jobs Center notifications.
 * Uses inline styles for maximum email client compatibility.
 */

const BRAND_COLOR = "#2563eb"; // primary blue
const BG_COLOR = "#f8fafc";
const CARD_BG = "#ffffff";
const TEXT_COLOR = "#1e293b";
const MUTED_COLOR = "#64748b";
const SITE_URL = "https://cdljobscenter.com";

interface EmailTemplateParams {
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  preferencesUrl?: string;
}

export function buildNotificationEmail({
  title,
  body,
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
                    ${escapeHtml(body)}
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
    new_application: "View Application",
    stage_change: "View Status",
    new_message: "Read Message",
    new_match: "View Match",
    new_lead: "View Lead",
    subscription_event: "View Subscription",
    profile_reminder: "Complete Profile",
    weekly_digest: "View Dashboard",
    welcome: "Get Started",
  };

  return {
    ctaText: ctaMap[type] || "View on CDL Jobs Center",
    ctaUrl: fullUrl,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
