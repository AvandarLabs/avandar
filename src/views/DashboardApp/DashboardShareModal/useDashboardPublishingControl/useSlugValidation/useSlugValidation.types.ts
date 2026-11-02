import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardSlugValidationFailure } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types";

/** The server's verdict on one candidate slug. */
export type SlugValidationResult =
  | { isValid: true }
  | DashboardSlugValidationFailure;

/** Everything the share modal needs to know about the slug field's check. */
export type SlugValidationState = {
  hasPendingSlugCheck: boolean;
  isSlugAccepted: boolean;
  isSlugRejected: boolean;
  slugErrorMessage: string | undefined;
};

/**
 * Which slug check the hook is currently waiting on. Recorded at dispatch and
 * compared in `onSuccess` so a response that a later keystroke has already
 * superseded is dropped instead of overwriting the newer answer.
 */
export type SlugValidationRequest = {
  slug: string;
  visibility: Dashboard.Visibility;
};
