import { randomUUID } from "node:crypto";
import {
  buildCkanMetacatalogRows,
  buildSocrataMetacatalogRow,
} from "@pipelines/open-data-metacatalog/buildMetacatalogRows";
import { CONFIGURED_DRIVES } from "@pipelines/open-data-metacatalog/configuredDrives";
import { upsertMetacatalogRows } from "@pipelines/open-data-metacatalog/upsertMetacatalogRows";
import { createSupabaseAdminClient } from "@pipelines/world-bank__wdi/catalogOpenDataInsert";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient";
import { createOpenDataHttp } from "$/connectors/open-data/createOpenDataHttp";
import { createSocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient";
import type { MetacatalogRow } from "@pipelines/open-data-metacatalog/buildMetacatalogRows";
import type { ConfiguredDrive } from "@pipelines/open-data-metacatalog/configuredDrives";

/** Ceiling for a metadata JSON response - never a resource download. */
const MAX_METADATA_BYTES = 10 * 1024 * 1024;

/** One Discovery API page, matching Socrata's own reasonable page size. */
const SOCRATA_PAGE_SIZE = 100;

async function _enumerateCkanDrive(
  drive: Readonly<ConfiguredDrive>,
): Promise<MetacatalogRow[]> {
  const http = createOpenDataHttp({ maxBytes: MAX_METADATA_BYTES });
  const discovery = createCkanDiscoveryClient(http);
  const client = createCkanClient(http);

  const slugs = await discovery.listDatasets({ baseUrl: drive.baseUrl });
  const rows: MetacatalogRow[] = [];
  // Sequential on purpose: this is an offline batch job, not a user-facing
  // request, and each iteration is independent - no ordering dependency,
  // just no need yet for the added complexity of a concurrency limiter.
  for (const slug of slugs) {
    const ckanPackage = await client.getPackage({
      baseUrl: drive.baseUrl,
      ckanDatasetId: slug,
    });
    rows.push(...buildCkanMetacatalogRows({ drive, ckanPackage }));
  }
  return rows;
}

async function _enumerateSocrataDrive(
  drive: Readonly<ConfiguredDrive>,
): Promise<MetacatalogRow[]> {
  const http = createOpenDataHttp({ maxBytes: MAX_METADATA_BYTES });
  const discovery = createSocrataDiscoveryClient(http);
  const domain = new URL(drive.baseUrl).host;

  const rows: MetacatalogRow[] = [];
  let offset = 0;
  // Sequential pagination on purpose: each page's offset depends on the
  // previous page's result count, so this cannot run concurrently.
  for (;;) {
    const page = await discovery.search({
      domains: [domain],
      limit: SOCRATA_PAGE_SIZE,
      offset,
    });
    for (const result of page) {
      rows.push(buildSocrataMetacatalogRow({ drive, result }));
    }
    if (page.length < SOCRATA_PAGE_SIZE) {
      break;
    }
    offset += SOCRATA_PAGE_SIZE;
  }
  return rows;
}

async function _enumerateDrive(
  drive: Readonly<ConfiguredDrive>,
): Promise<MetacatalogRow[]> {
  if (drive.apiService === "ckan") {
    return await _enumerateCkanDrive(drive);
  }
  return await _enumerateSocrataDrive(drive);
}

/**
 * Enumerates every configured drive and upserts one
 * `catalog_entries__open_data` row per readable resource it finds.
 *
 * Not an `EtlEngine` pipeline: nothing here extracts, transforms, or loads
 * data into Parquet. It only discovers metadata and writes catalog rows -
 * the actual resource bytes are still fetched live on first query, by the
 * existing `acquireOpenDataResourceWithCache` path, completely unchanged.
 *
 * Known gap, not yet hit in practice because `CONFIGURED_DRIVES` ships
 * empty: `Promise.all` is fail-fast, so one drive throwing (e.g. a rate
 * limit - see `configuredDrives.ts`'s docstring) discards every other
 * drive's already-enumerated rows instead of upserting what did succeed.
 * Worth revisiting (`Promise.allSettled` plus a per-drive try/catch) before
 * a drive is reintroduced.
 */
export async function run(): Promise<string> {
  const pipelineRunId = randomUUID();
  const supabase = createSupabaseAdminClient();

  const rowsPerDrive = await Promise.all(
    CONFIGURED_DRIVES.map(_enumerateDrive),
  );

  const rows = rowsPerDrive.flat();
  console.log(
    `[open-data-metacatalog] run ${pipelineRunId}: discovered ${String(rows.length)} resources across ${String(CONFIGURED_DRIVES.length)} drives`,
  );
  await upsertMetacatalogRows({ supabase, rows });

  return pipelineRunId;
}
