import type { OpenDataAcquisitionFailure } from "$/connectors/open-data/openDataErrors.ts";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";

/**
 * Why a failed read means a listing's dataset cannot be loaded, or
 * `undefined` when the failure says nothing about the dataset itself.
 *
 * A file host that does not answer once the catalog's API has answered is
 * `unreachable_dataset`, though it may be temporary. The catalog API's own
 * failure (`ckan-unreachable`, `ckan-action-failed`) is its outage, not the
 * dataset's. Socrata serves a dataset's metadata and rows from the same
 * portal, so `socrata-unreachable` cannot tell a portal outage from a dead
 * dataset and leaves the listing valid.
 *
 * @param failure - Why the read failed.
 * @returns The reason to mark the listing invalid with, if any.
 */
export function failureToInvalidDatasetReason(
  failure: OpenDataAcquisitionFailure,
): DataCatalogListing.InvalidDatasetReason | undefined {
  switch (failure.code) {
    case "resource-empty":
      return "empty_dataset";
    case "resource-not-found":
      return "dataset_not_found";
    case "resource-authorization-required":
    case "ckan-authorization-required":
      return "authorization_required";
    case "resource-is-remote-api":
    case "resource-format-unsupported":
    case "resource-format-changed":
      return "unsupported_format";
    case "resource-host-mismatch":
      return "external_host";
    case "resource-unreachable":
      return "unreachable_dataset";
    case "ckan-unreachable":
    case "ckan-action-failed":
    case "socrata-unreachable":
    case "socrata-too-large":
    case "resource-too-large":
    case "access-shape-invalid":
    case "freshness-probe-invalid":
      return undefined;
  }
}
