import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { DataCatalogRelationColumn } from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumn";
import type { ColumnTypeVerificationCoordinator } from "@/lib/openData/createColumnTypeVerificationCoordinator/createColumnTypeVerificationCoordinator";

/**
 * The columns to add a catalog listing to a workspace with. A listing whose
 * column types were never verified cannot be added (the database refuses
 * it), and one being verified right now is about to change, so either is
 * verified first, joining a verification already running. The columns are
 * then read fresh, since verifying can rename, add, or delete them.
 *
 * @param options.listing - The listing being added.
 * @param options.coordinator - Runs and tracks the verifications.
 * @param options.readColumns - Reads the listing's stored columns.
 * @throws When the listing's column types cannot be verified.
 */
export async function readCatalogColumnsForAdding(options: {
  listing: Pick<DataCatalogListing.T, "id" | "dateColumnTypeLastVerified">;
  coordinator: ColumnTypeVerificationCoordinator;
  readColumns: (
    catalogListingId: DataCatalogListing.Id,
  ) => Promise<readonly DataCatalogRelationColumn.T[]>;
}): Promise<readonly DataCatalogRelationColumn.T[]> {
  const { listing, coordinator } = options;
  const isVerificationNeeded =
    listing.dateColumnTypeLastVerified === undefined ||
    coordinator.getStatus(listing.id) === "verifying";
  if (isVerificationNeeded) {
    await coordinator.verify(listing.id);
  }
  return await options.readColumns(listing.id);
}
