import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { notifyError } from "./notify";

const EXPIRED_SESSION_TITLE = msg`Your session has expired`;
const EXPIRED_SESSION_MESSAGE = msg`Please log in again to continue.`;

// TODO(jpsyx): add an option here to reset the router so it redirects the user
// back to the login page.

/**
 * Show an error notification informing the user that their session has
 * expired and that they should log in again.
 */
export function notifyExpiredSession(): void {
  notifyError({
    title: i18n._(EXPIRED_SESSION_TITLE),
    message: i18n._(EXPIRED_SESSION_MESSAGE),
  });
}
