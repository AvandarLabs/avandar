import { randomUUID } from "node:crypto";
import { CONFIGURED_DRIVES } from "@pipelines/socrata/configuredDrives/configuredDrives";
import { makeListingRowFromSocrataResult } from "@pipelines/socrata/makeListingRowFromSocrataResult/makeListingRowFromSocrataResult";
import { createSupabaseAdminClient } from "@pipelines/shared/createSupabaseAdminClient";
import { upsertDataCatalogListingRows } from "@pipelines/shared/upsertDataCatalogListingRows/upsertDataCatalogListingRows";
import { createOpenDataHttp } from "$/connectors/open-data/createOpenDataHttp";
import { createSocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";
import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";

/** Ceiling for a metadata JSON response - never a resource download. */
const MAX_METADATA_BYTES = 10 * 1024 * 1024;

/** One Discovery API page, matching Socrata's own reasonable page size. */
const SOCRATA_PAGE_SIZE = 100;

async function _enumerateDrive(
  drive: Readonly<ConfiguredDrive>,
): Promise<DataCatalogListingRow[]> {
  const http = createOpenDataHttp({ maxBytes: MAX_METADATA_BYTES });
  const discovery = createSocrataDiscoveryClient(http);
  const domain = new URL(drive.baseUrl).host;

  const rows: DataCatalogListingRow[] = [];
  let offset = 0;
  // Sequential pagination on purpose: each page's offset depends on the
  // previous page's result count, so this cannot run concurrently.
  for (;;) {
    const page = await discovery.search({
      domains: [domain],
      limit: SOCRATA_PAGE_SIZE,
      offset,
    });
    rows.push(
      ...page.map((result) => {
        return makeListingRowFromSocrataResult({ drive, result });
      }),
    );
    if (page.length < SOCRATA_PAGE_SIZE) {
      break;
    }
    offset += SOCRATA_PAGE_SIZE;
  }
  return rows;
}

/**
 * Enumerates every configured Socrata drive and upserts one
 * `data_catalog_listings` row per discovered dataset.
 *
 * Each drive is enumerated independently with `Promise.allSettled`: one
 * drive throwing (e.g. a rate limit) is logged and skipped rather than
 * discarding every other drive's already-enumerated rows, so a partial run
 * still upserts what did succeed.
 */
export async function run(): Promise<string> {
  const pipelineRunId = randomUUID();
  const supabase = createSupabaseAdminClient();

  const results = await Promise.allSettled(
    CONFIGURED_DRIVES.map(_enumerateDrive),
  );

  const rows: DataCatalogListingRow[] = [];
  results.forEach((result, index) => {
    const drive = CONFIGURED_DRIVES[index];
    if (result.status === "fulfilled") {
      rows.push(...result.value);
    } else {
      console.error(
        `[socrata] run ${pipelineRunId}: drive ${drive?.baseUrl ?? "unknown"} failed:`,
        result.reason,
      );
    }
  });

  console.log(
    `[socrata] run ${pipelineRunId}: discovered ${String(rows.length)} resources across ${String(CONFIGURED_DRIVES.length)} drives`,
  );
  await upsertDataCatalogListingRows({ supabase, rows });

  return pipelineRunId;
}
