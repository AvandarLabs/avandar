import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { buildParquetCachePartPaths } from "$/connectors/open-data/buildParquetCachePartPath/buildParquetCachePartPath";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Json } from "$/types/database.types";
import type { Locator, Page } from "@playwright/test";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** One column of a seeded listing, as its relation column records it. */
type SeedColumn = Readonly<{ name: string; dataType: "BIGINT" | "VARCHAR" }>;

/** A listing to seed, with the rows of its ready Parquet copy. */
type SeedListing = Readonly<{
  displayName: string;
  externalDatasetId: string;
  apiResourceId: string;
  columns: readonly SeedColumn[];
  /** A `SELECT` whose columns match `columns`, in order. */
  rowsSql: string;
  numRows: number;
  /** The listing's `companion_listings`, as the pipeline writes it. */
  companionListings: Json[];
}>;

/**
 * The pipeline the seeded listings are filed under. Only this spec uses it,
 * so cleaning up by it removes this spec's rows and nothing else, including
 * rows a killed earlier run left behind.
 */
const E2E_PIPELINE_NAME = "e2e-odc-recommended-listings";

/**
 * A made-up drive. Real GHO listings may be written to the same database
 * while this runs, and they live under the real host, so the two never
 * resolve to each other. The host is unreachable on purpose: the edge
 * function's freshness check then fails, and a failed check serves the copy
 * as current, so nothing here reaches a real source.
 */
const E2E_API_BASE_URL = "https://e2e-gho-fixture.invalid/api";

/** A made-up word in both seeded listings' names and in no real one. */
const E2E_SEARCH_WORD = "quellbrook";

/** The public bucket the pipeline server writes Parquet copies to. */
const OPEN_DATA_BUCKET = "opendata";

const NUM_INDICATOR_ROWS = 4;

const DIMENSION_LISTING: SeedListing = {
  displayName: "Quellbrook country codes",
  externalDatasetId: "DIMENSION/COUNTRY",
  apiResourceId: "DIMENSION/COUNTRY/DimensionValues",
  columns: [
    { name: "Code", dataType: "VARCHAR" },
    { name: "Title", dataType: "VARCHAR" },
    { name: "Dimension", dataType: "VARCHAR" },
    { name: "ParentDimension", dataType: "VARCHAR" },
    { name: "ParentCode", dataType: "VARCHAR" },
    { name: "ParentTitle", dataType: "VARCHAR" },
  ],
  rowsSql: `SELECT * FROM (VALUES
    ('SDN', 'Sudan', 'COUNTRY', 'WHOREGION', 'EMR', 'Eastern Mediterranean'),
    ('KEN', 'Kenya', 'COUNTRY', 'WHOREGION', 'AFR', 'Africa'),
    ('PER', 'Peru', 'COUNTRY', 'WHOREGION', 'AMR', 'Americas')
  ) AS dimension_values(
    Code, Title, Dimension, ParentDimension, ParentCode, ParentTitle
  )`,
  numRows: 3,
  companionListings: [],
};

const INDICATOR_LISTING: SeedListing = {
  displayName: "Quellbrook measles cases",
  externalDatasetId: "WHS3_62",
  apiResourceId: "WHS3_62",
  columns: [
    { name: "Id", dataType: "BIGINT" },
    { name: "SpatialDimType", dataType: "VARCHAR" },
    { name: "SpatialDim", dataType: "VARCHAR" },
    { name: "TimeDim", dataType: "BIGINT" },
    { name: "NumericValue", dataType: "BIGINT" },
  ],
  rowsSql: `SELECT * FROM (VALUES
    (1::BIGINT, 'COUNTRY', 'SDN', 2023::BIGINT, 120::BIGINT),
    (2::BIGINT, 'COUNTRY', 'SDN', 2024::BIGINT, 340::BIGINT),
    (3::BIGINT, 'COUNTRY', 'KEN', 2024::BIGINT, 75::BIGINT),
    (4::BIGINT, 'COUNTRY', 'PER', 2024::BIGINT, 2::BIGINT)
  ) AS indicator_values(Id, SpatialDimType, SpatialDim, TimeDim, NumericValue)`,
  numRows: NUM_INDICATOR_ROWS,
  companionListings: [
    {
      kind: "lookup",
      externalDatasetId: DIMENSION_LISTING.externalDatasetId,
      apiResourceId: DIMENSION_LISTING.apiResourceId,
      joinOn: [
        { column: "SpatialDimType", companionColumn: "Dimension" },
        { column: "SpatialDim", companionColumn: "Code" },
      ],
    },
  ],
};

/** Writes a listing's copy as one Parquet part with DuckDB. */
async function _buildCopyPart(rowsSql: string): Promise<Uint8Array> {
  const directory = await mkdtemp(join(tmpdir(), "e2e-odc-recommended-"));
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  try {
    const partPath = join(directory, "part-0.parquet");
    await connection.run(`COPY (${rowsSql}) TO '${partPath}' (FORMAT parquet)`);
    return await readFile(partPath);
  } finally {
    connection.closeSync();
    instance.closeSync();
    await rm(directory, { recursive: true, force: true });
  }
}

/** Removes every object in one `opendata` folder. */
async function _removeCopyFolder(
  admin: AdminClient,
  folderPath: string,
): Promise<void> {
  const { data: objects, error: listError } = await admin.storage
    .from(OPEN_DATA_BUCKET)
    .list(folderPath);
  if (listError) {
    throw new Error(`e2e copy list: ${listError.message}`);
  }
  if (objects.length === 0) {
    return;
  }
  const { error: removeError } = await admin.storage
    .from(OPEN_DATA_BUCKET)
    .remove(
      objects.map((object) => {
        return `${folderPath}/${object.name}`;
      }),
    );
  if (removeError) {
    throw new Error(`e2e copy remove: ${removeError.message}`);
  }
}

/** Deletes the datasets any workspace added from the given listings. */
async function _deleteDatasetsAddedFrom(
  admin: AdminClient,
  listingIds: readonly string[],
): Promise<void> {
  const { data: sources, error: sourcesError } = await admin
    .from("datasets__open_data")
    .select("dataset_id")
    .in("catalog_listing_id", [...listingIds]);
  if (sourcesError) {
    throw new Error(`e2e open-data source read: ${sourcesError.message}`);
  }
  if (sources.length === 0) {
    return;
  }
  const { error: datasetsError } = await admin
    .from("datasets")
    .delete()
    .in(
      "id",
      sources.map((source) => {
        return source.dataset_id;
      }),
    );
  if (datasetsError) {
    throw new Error(`e2e dataset delete: ${datasetsError.message}`);
  }
}

/**
 * Deletes everything this spec seeds or creates: the datasets added from its
 * listings, the listings' copies in Storage, and the listings, whose relation
 * columns go with them. Deleting a listing deletes its open-data source rows
 * but not the datasets they belong to, so the datasets go first.
 */
async function _deleteFixtures(admin: AdminClient): Promise<void> {
  const { data: listings, error: listingsError } = await admin
    .from("data_catalog_listings")
    .select("id, parquet_cache_folder_path")
    .eq("pipeline_name", E2E_PIPELINE_NAME);
  if (listingsError) {
    throw new Error(`e2e listing read: ${listingsError.message}`);
  }
  if (listings.length === 0) {
    return;
  }
  const listingIds = listings.map((listing) => {
    return listing.id;
  });
  await _deleteDatasetsAddedFrom(admin, listingIds);
  for (const listing of listings) {
    if (listing.parquet_cache_folder_path !== null) {
      await _removeCopyFolder(admin, listing.parquet_cache_folder_path);
    }
  }
  const { error: deleteError } = await admin
    .from("data_catalog_listings")
    .delete()
    .in("id", listingIds);
  if (deleteError) {
    throw new Error(`e2e listing delete: ${deleteError.message}`);
  }
}

/** Uploads a listing's one-part copy and returns the folder it is in. */
async function _uploadCopy(
  admin: AdminClient,
  options: Readonly<{ listingId: string; part: Uint8Array }>,
): Promise<string> {
  const folderPath = `catalog-cache/${options.listingId}/${crypto.randomUUID()}`;
  const [partPath] = buildParquetCachePartPaths({ folderPath, partCount: 1 });
  const { error } = await admin.storage
    .from(OPEN_DATA_BUCKET)
    .upload(partPath!, options.part, {
      contentType: "application/vnd.apache.parquet",
      upsert: true,
    });
  if (error) {
    throw new Error(`e2e copy upload: ${error.message}`);
  }
  return folderPath;
}

/** Inserts a listing's relation columns, in order. */
async function _insertRelationColumns(
  admin: AdminClient,
  options: Readonly<{ listingId: string; columns: readonly SeedColumn[] }>,
): Promise<void> {
  const { error } = await admin
    .from("data_catalog_listings__relation_columns")
    .insert(
      options.columns.map((column, columnIndex) => {
        return {
          catalog_listing_id: options.listingId,
          column_name: column.name,
          display_order: columnIndex,
          original_data_type: column.dataType,
          cast_data_type: column.dataType,
        };
      }),
    );
  if (error) {
    throw new Error(`e2e relation columns insert: ${error.message}`);
  }
}

/**
 * Seeds an OData listing in the fixture drive whose copy the pipeline server
 * has already built. The build itself is the pipeline server's work and is
 * tested there. This spec covers what a user does with built copies.
 */
async function _seedListing(
  admin: AdminClient,
  listing: SeedListing,
): Promise<void> {
  const listingId = crypto.randomUUID();
  const part = await _buildCopyPart(listing.rowsSql);
  const folderPath = await _uploadCopy(admin, { listingId, part });
  const { error: listingError } = await admin
    .from("data_catalog_listings")
    .insert({
      id: listingId,
      access_kind: "api_resource",
      display_name: listing.displayName,
      organization1_name: "E2E Health Observatory",
      pipeline_name: E2E_PIPELINE_NAME,
      pipeline_run_id: "e2e-run",
      api_service: "odata",
      api_base_url: E2E_API_BASE_URL,
      external_dataset_id: listing.externalDatasetId,
      api_resource_id: listing.apiResourceId,
      api_resource_format: "ODATA",
      is_workspace_loadable: true,
      companion_listings: listing.companionListings,
      date_column_type_last_verified: new Date().toISOString(),
      parquet_cache_status: "ready",
      parquet_cache_folder_path: folderPath,
      parquet_cache_part_count: 1,
      parquet_cache_source_version: "e2e-version",
      parquet_cache_built_at: new Date().toISOString(),
      parquet_cache_row_count: listing.numRows,
      parquet_cache_byte_size: part.byteLength,
    });
  if (listingError) {
    throw new Error(`e2e listing insert: ${listingError.message}`);
  }
  await _insertRelationColumns(admin, {
    listingId,
    columns: listing.columns,
  });
}

/** Finds the seeded indicator in the open data catalog and opens it. */
async function _openIndicatorListing(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tab", { name: "Open data" }).click();
  await page
    .getByRole("textbox", { name: "Search open data" })
    .fill(E2E_SEARCH_WORD, { timeout: LONG_WAIT });
  await page
    .getByRole("region", { name: "Results" })
    .getByRole("listbox", { name: "Open datasets" })
    .getByRole("option", { name: new RegExp(INDICATOR_LISTING.displayName) })
    .click();
}

/** The recommended listing's row in the open listing's detail. */
function _recommendedRow(page: Page): Locator {
  return page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Recommended with this dataset" }),
    })
    .getByRole("listitem")
    .filter({ hasText: DIMENSION_LISTING.displayName });
}

test.describe("ODC recommended listings", () => {
  test.beforeEach(async () => {
    const admin = createSupabaseAdminClient();
    // A killed earlier run cannot clean up after itself, so its listings
    // would turn up in this run's search.
    await _deleteFixtures(admin);
    await _seedListing(admin, DIMENSION_LISTING);
    await _seedListing(admin, INDICATOR_LISTING);
  });

  test.afterEach(async () => {
    await _deleteFixtures(createSupabaseAdminClient());
  });

  test("adds the listing recommended with an indicator from the notification after adding the indicator", async ({
    page,
    e2eWorkerDb,
  }) => {
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
    await _openIndicatorListing({
      page,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    const recommendedRow = _recommendedRow(page);
    await expect(
      recommendedRow.getByRole("button", {
        name: DIMENSION_LISTING.displayName,
        exact: true,
      }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(
      recommendedRow.getByText("Names the codes in SpatialDim", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      recommendedRow.getByRole("button", {
        name: `Add ${DIMENSION_LISTING.displayName} to workspace`,
      }),
    ).toBeVisible();
    await recommendedRow.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: ".temp/feat-gho-pipeline/recommended-with-this-dataset.png",
    });

    await page
      .getByRole("button", { name: "Add dataset to workspace" })
      .click();
    const addedNotification = page
      .getByRole("alert")
      .filter({ hasText: `"${INDICATOR_LISTING.displayName}" is now in` });
    await expect(addedNotification).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(
      addedNotification.getByText(
        `Recommended with it: ${DIMENSION_LISTING.displayName}`,
      ),
    ).toBeVisible();
    await page.screenshot({
      path: ".temp/feat-gho-pipeline/dataset-added-notification.png",
    });

    await addedNotification
      .getByRole("button", { name: "Add them too" })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: `"${DIMENSION_LISTING.displayName}" is now in` }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(recommendedRow.getByText("In your workspace")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });
    await page.screenshot({
      path: ".temp/feat-gho-pipeline/recommendation-added.png",
    });

    await page
      .getByRole("link", { name: INDICATOR_LISTING.displayName, exact: true })
      .click();
    // The count is a COUNT(*) over the data loaded from the copy.
    await expect(
      page.getByText(new RegExp(`^Open data.*\\b${NUM_INDICATOR_ROWS} rows`)),
    ).toBeVisible({ timeout: LONG_WAIT });
  });
});
