import type { DashboardSlugValidationFailure } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types.ts";

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 64;

/** Returns the format violation for a requested dashboard vanity slug. */
export function validateDashboardSlug(
  slug: string,
): DashboardSlugValidationFailure | undefined {
  if (!slug) {
    return { isValid: false, reason: "empty" };
  }
  if (slug.includes(" ")) {
    return { isValid: false, reason: "spaces" };
  }
  if (!slug.match(/^[a-z0-9-]+$/u)) {
    return { isValid: false, reason: "invalid_characters" };
  }
  if (slug.length < SLUG_MIN_LENGTH) {
    return { isValid: false, reason: "too_short", limit: SLUG_MIN_LENGTH };
  }
  return slug.length > SLUG_MAX_LENGTH ?
      { isValid: false, reason: "too_long", limit: SLUG_MAX_LENGTH }
    : undefined;
}
