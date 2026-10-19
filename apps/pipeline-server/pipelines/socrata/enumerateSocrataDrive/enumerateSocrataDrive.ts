import { makeListingRowFromSocrataResult } from "@pipelines/socrata/makeListingRowFromSocrataResult/makeListingRowFromSocrataResult";
import type { SocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";

/** One Discovery API page, matching Socrata's own reasonable page size. */
const SOCRATA_PAGE_SIZE = 100;

/**
 * Lists one drive's datasets as `data_catalog_listings` rows, a page at a
 * time. With a `limit`, it stops after that many datasets and never asks the
 * API for more than it still needs.
 *
 * @param params.drive - The Socrata portal to enumerate.
 * @param params.discovery - The Discovery API client.
 * @param params.limit - The most datasets to list. No cap if omitted.
 * @returns One row per dataset.
 */
export async function enumerateSocrataDrive(params: {
  drive: Readonly<ConfiguredDrive>;
  discovery: SocrataDiscoveryClient;
  limit?: number;
}): Promise<DataCatalogListingRow[]> {
  const { drive, discovery, limit = Number.POSITIVE_INFINITY } = params;
  const domain = new URL(drive.baseUrl).host;
  const rows: DataCatalogListingRow[] = [];
  // Sequential pagination on purpose: each page's offset depends on the
  // previous page's result count, so this cannot run concurrently.
  while (rows.length < limit) {
    const pageSize = Math.min(SOCRATA_PAGE_SIZE, limit - rows.length);
    const page = await discovery.search({
      domains: [domain],
      limit: pageSize,
      offset: rows.length,
    });
    rows.push(
      ...page.map((result) => {
        return makeListingRowFromSocrataResult({ drive, result });
      }),
    );
    if (page.length < pageSize) {
      break;
    }
  }
  return rows;
}
