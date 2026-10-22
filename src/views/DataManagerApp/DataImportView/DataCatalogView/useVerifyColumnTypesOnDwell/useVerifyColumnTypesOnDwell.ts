import { useEffect, useSyncExternalStore } from "react";
import { isColumnTypeVerificationDue } from "@/lib/openData/verifyOpenDataColumnTypes/verifyOpenDataColumnTypes";
import { Logger } from "@/utils/Logger";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type {
  ColumnTypeVerificationCoordinator,
  ColumnTypeVerificationStatus,
} from "@/lib/openData/createColumnTypeVerificationCoordinator/createColumnTypeVerificationCoordinator";

/**
 * How long a listing must stay open before its column types are verified:
 * long enough to mean real interest in adding it, rather than scrolling
 * past.
 */
export const COLUMN_TYPE_VERIFICATION_DWELL_MS = 3000;

/**
 * Verifies an open catalog listing's column types once it has been open for
 * `COLUMN_TYPE_VERIFICATION_DWELL_MS`, when they are unverified or stale.
 * A listing is started this way at most once while the page is open, so a
 * failure is not retried by dwelling again: adding the listing retries it.
 * A failure is logged, and the coordinator reports it.
 *
 * @param options.listing - The open listing, or `undefined` when none is.
 * @param options.coordinator - Runs and tracks the verifications.
 */
export function useVerifyColumnTypesOnDwell(options: {
  listing: DataCatalogListing.T | undefined;
  coordinator: ColumnTypeVerificationCoordinator;
}): void {
  const { listing, coordinator } = options;
  const isDue = listing !== undefined && isColumnTypeVerificationDue(listing);
  const listingId = listing?.id;

  useEffect(() => {
    if (!isDue || listingId === undefined) {
      return undefined;
    }
    const timer = setTimeout(() => {
      if (coordinator.hasAttempted(listingId)) {
        return;
      }
      coordinator.verify(listingId).catch((error: unknown) => {
        Logger.warn("Could not verify a catalog listing's column types", {
          catalogListingId: listingId,
          error,
        });
      });
    }, COLUMN_TYPE_VERIFICATION_DWELL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [isDue, listingId, coordinator]);
}

/**
 * Where a listing's column type verification stands on this page, kept
 * current as the coordinator runs it.
 */
export function useColumnTypeVerificationStatus(options: {
  catalogListingId: DataCatalogListing.Id | undefined;
  coordinator: ColumnTypeVerificationCoordinator;
}): ColumnTypeVerificationStatus {
  const { catalogListingId, coordinator } = options;
  return useSyncExternalStore(coordinator.subscribe, () => {
    return catalogListingId === undefined
      ? "idle"
      : coordinator.getStatus(catalogListingId);
  });
}
