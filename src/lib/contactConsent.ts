/** Check if driver has opted in to contact (job alerts, employment offers).
 *  Returns false if no profile or wantsContact !== "Yes".
 */
export function hasContactConsent(wantsContact: string | undefined): boolean {
  return wantsContact === "Yes";
}
// TODO: Enforce in backend edge functions for email/notification pipelines.
// Any automated outreach (job alerts, marketing emails) must check this flag
// before sending to the driver.
