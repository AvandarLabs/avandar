import { isReadableCkanResource } from "$/connectors/open-data/isReadableCkanResource/isReadableCkanResource";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { ConfiguredDrive } from "@pipelines/open-data-catalog-listings/configuredDrives/configuredDrives";
import type { CatalogListingRow } from "@pipelines/open-data-catalog-listings/CatalogListingRow.types";

/**
 * Builds one row per CKAN resource worth reading, using the exact same
 * readability rule the acquisition path enforces at query time. A dataset
 * with no readable resource yields no rows at all - it is still visible
 * via `package_list`, just not catalog-worthy.
 */
export function makeCkanListingRowsFromPackage(params: {
  drive: Readonly<ConfiguredDrive>;
  ckanPackage: Readonly<CkanPackage>;
}): CatalogListingRow[] {
  const { drive, ckanPackage } = params;
  return ckanPackage.resources
    .filter(isReadableCkanResource)
    .map((resource) => {
      return {
        access_kind: "api_resource",
        api_service: "ckan",
        api_base_url: drive.baseUrl,
        external_dataset_id: ckanPackage.name,
        api_resource_id: resource.id,
        api_resource_format: resource.format.toUpperCase(),
        display_name: resource.name,
        external_organization_name: drive.organizationName,
      } satisfies CatalogListingRow;
    });
}
