/** Check if driver has opted in to contact (job alerts, employment offers).
 *  Returns false if no profile or wantsContact !== "Yes".
 */
export function hasContactConsent(wantsContact: string | undefined): boolean {
  return wantsContact === "Yes";
}
// Backend enforcement: send-scheduled-notifications checks wants_contact
// before sending profile_reminder outreach emails to drivers.
