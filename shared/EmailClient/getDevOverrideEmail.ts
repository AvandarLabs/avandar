/**
 * Returns the override email address to use in development.
 *
 * If the `DEV_EMAIL_OVERRIDE` environment variable is set, it will return that
 * value. Otherwise, it will return the default Resend test email address.
 */
export function getDevOverrideEmail(): string {
  return process.env.DEV_EMAIL_OVERRIDE || "delivered@resend.dev";
}
