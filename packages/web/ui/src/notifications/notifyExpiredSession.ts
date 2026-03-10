import { notifyError } from "./notify";

// TODO(jpsyx): add an option here to reset the router so it redirects the user
// back to the login page.
export function notifyExpiredSession(): void {
  notifyError({
    title: "Your session has expired",
    message: "Please log in again to continue.",
  });
}
