import { useEffect, useRef } from "react";
import { isColumnTypeVerificationDue } from "@/lib/openData/verifyOpenDataColumnTypes/verifyOpenDataColumnTypes";
import { Logger } from "@/utils/Logger";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/**
 * How long a listing must stay open before its column types are verified:
 * long enough to mean real interest in adding it, rather than scrolling
 * past.
 */
export const COLUMN_TYPE_VERIFICATION_DWELL_MS = 3000;

/**
 * Verifies an open catalog listing's column types once it has been open for
 * `COLUMN_TYPE_VERIFICATION_DWELL_MS`, when they are unverified or stale.
 * Each listing is tried at most once while the page is open, whether or not
 * the attempt succeeds. A failure is logged and otherwise ignored: the
 * listing keeps its text columns.
 *
 * Nothing stops two people from verifying the same listing at once. Both
 * write the same result, so it is wasted work rather than a wrong answer.
 *
 * @param options.listing - The open listing, or `undefined` when none is.
 * @param options.verify - Verifies one listing's column types.
 * @param options.onVerified - Called after a listing's types are written.
 */
export function useVerifyColumnTypesOnDwell(options: {
  listing: DataCatalogListing.T | undefined;
  verify: (catalogListingId: DataCatalogListing.Id) => Promise<void>;
  onVerified: (catalogListingId: DataCatalogListing.Id) => void;
}): void {
  const { listing, verify, onVerified } = options;
  const attemptedListingIds = useRef(new Set<DataCatalogListing.Id>());
  const isDue = listing !== undefined && isColumnTypeVerificationDue(listing);
  const listingId = listing?.id;

  useEffect(() => {
    if (!isDue || listingId === undefined) {
      return undefined;
    }
    const timer = setTimeout(() => {
      if (attemptedListingIds.current.has(listingId)) {
        return;
      }
      attemptedListingIds.current.add(listingId);
      verify(listingId).then(
        () => {
          onVerified(listingId);
        },
        (error: unknown) => {
          Logger.warn("Could not verify a catalog listing's column types", {
            catalogListingId: listingId,
            error,
          });
        },
      );
    }, COLUMN_TYPE_VERIFICATION_DWELL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [isDue, listingId, verify, onVerified]);
}
