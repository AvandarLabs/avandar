import type { OpenDataAcquisitionFailureCode } from "$/open-data/openDataErrors.ts";

/**
 * Maps an open data refusal onto the HTTP status that describes it.
 *
 * The switch is exhaustive with no default, so adding a failure code fails to
 * compile here rather than silently becoming a 500.
 *
 * Two groupings are deliberate. `ckan-authorization-required` is a **502**, not
 * a 401 or 403: the upstream source wants credentials Avandar does not hold, so
 * it is an upstream failure rather than a problem with the caller's own
 * authorization, and returning 401 would invite a client to retry with a
 * different token forever. The unreadable-entry cases are **409**, not 400,
 * because nothing the caller sends changes them: they are conflicts with what
 * the catalog stored.
 */
export function statusFromOpenDataFailure(
  code: OpenDataAcquisitionFailureCode,
): number {
  switch (code) {
    case "resource-not-found":
      return 404;
    case "resource-too-large":
      return 413;
    case "ckan-authorization-required":
    case "ckan-action-failed":
    case "resource-unreachable":
      return 502;
    case "access-shape-invalid":
    case "resource-is-remote-api":
    case "resource-format-unsupported":
    case "resource-format-changed":
    case "resource-host-mismatch":
      return 409;
  }
}
