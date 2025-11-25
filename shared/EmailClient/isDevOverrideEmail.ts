import { getDevOverrideEmail } from "./getDevOverrideEmail";

/**
 * Simple helper function to check if an email is the dev override email.
 */
export function isDevOverrideEmail(email: string): boolean {
  return email === getDevOverrideEmail();
}
