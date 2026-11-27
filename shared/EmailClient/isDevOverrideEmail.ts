import { getDevOverrideEmail } from "$/env/getDevOverrideEmail.ts";

/**
 * Returns whether an address matches the development override email.
 * Use it, for example, when deciding whether to warn about a real recipient.
 */
export function isDevOverrideEmail(email: string): boolean {
  return email === getDevOverrideEmail();
}
