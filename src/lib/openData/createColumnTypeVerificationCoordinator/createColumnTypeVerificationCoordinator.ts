import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/** Where one listing's column type verification stands on this page. */
export type ColumnTypeVerificationStatus = "idle" | "verifying" | "failed";

/** Runs and tracks column type verifications, one at a time per listing. */
export type ColumnTypeVerificationCoordinator = Readonly<{
  getStatus: (
    catalogListingId: DataCatalogListing.Id,
  ) => ColumnTypeVerificationStatus;
  /** Whether a verification of this listing was started on this page. */
  hasAttempted: (catalogListingId: DataCatalogListing.Id) => boolean;
  /**
   * Verifies a listing's column types, or joins the verification already
   * running for it. A listing whose last attempt failed is tried again.
   *
   * @throws When the verification fails.
   */
  verify: (catalogListingId: DataCatalogListing.Id) => Promise<void>;
  /** Calls `listener` whenever any listing's status changes. */
  subscribe: (listener: () => void) => () => void;
}>;

/**
 * Creates a coordinator that runs each listing's column type verification at
 * most once at a time on this page, so the catalog's dwell timer and its
 * "Add to workspace" button share one run instead of starting two.
 *
 * Nothing coordinates across browsers: two people can verify the same
 * listing at once (AVA-395).
 *
 * @param options.verify - Verifies one listing's column types.
 * @param options.onVerified - Called after a listing's types are written.
 */
export function createColumnTypeVerificationCoordinator(options: {
  verify: (catalogListingId: DataCatalogListing.Id) => Promise<void>;
  onVerified: (catalogListingId: DataCatalogListing.Id) => void;
}): ColumnTypeVerificationCoordinator {
  const runningVerifications = new Map<DataCatalogListing.Id, Promise<void>>();
  const failedListingIds = new Set<DataCatalogListing.Id>();
  const attemptedListingIds = new Set<DataCatalogListing.Id>();
  const listeners = new Set<() => void>();

  function _notify(): void {
    listeners.forEach((listener) => {
      listener();
    });
  }

  async function _run(catalogListingId: DataCatalogListing.Id): Promise<void> {
    try {
      await options.verify(catalogListingId);
      options.onVerified(catalogListingId);
    } catch (error) {
      failedListingIds.add(catalogListingId);
      throw error;
    } finally {
      runningVerifications.delete(catalogListingId);
      _notify();
    }
  }

  return {
    getStatus: (catalogListingId) => {
      if (runningVerifications.has(catalogListingId)) {
        return "verifying";
      }
      return failedListingIds.has(catalogListingId) ? "failed" : "idle";
    },
    hasAttempted: (catalogListingId) => {
      return attemptedListingIds.has(catalogListingId);
    },
    verify: (catalogListingId) => {
      const running = runningVerifications.get(catalogListingId);
      if (running !== undefined) {
        return running;
      }
      attemptedListingIds.add(catalogListingId);
      failedListingIds.delete(catalogListingId);
      const verification = _run(catalogListingId);
      runningVerifications.set(catalogListingId, verification);
      _notify();
      return verification;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
