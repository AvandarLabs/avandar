import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Locator, Page } from "@playwright/test";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * The pipeline every row this spec seeds is filed under. Only this spec uses
 * it, so deleting by it removes this spec's rows and nothing else, including
 * rows a killed earlier run left behind.
 */
const E2E_CATALOG_PIPELINE_NAME = "e2e-catalog-filters";

/** A made-up word in every seeded listing's name and in no real one. */
const E2E_CATALOG_SEARCH_WORD = "quillfeather";

/** The seeded listings, one per row of the catalog this spec filters. */
const E2E_CATALOG_LISTINGS = [
  {
    displayName: "Quillfeather taxi trips",
    organization1Name: "E2E City",
    organization2Name: "E2E Taxi Office",
    domain: "Transportation",
    tag: "e2e-taxi",
  },
  {
    displayName: "Quillfeather ferry riders",
    organization1Name: "E2E City",
    organization2Name: "E2E Transit Office",
    domain: "Transportation",
    tag: "e2e-ferry",
  },
  {
    displayName: "Quillfeather clinic visits",
    organization1Name: "E2E State",
    organization2Name: "E2E Health Office",
    domain: "Health",
    tag: "e2e-clinic",
  },
] as const;

/** Deletes every catalog listing and drive filed under this spec's pipeline. */
async function _deleteE2ECatalogFixtures(admin: AdminClient): Promise<void> {
  const { error: listingsError } = await admin
    .from("data_catalog_listings")
    .delete()
    .eq("pipeline_name", E2E_CATALOG_PIPELINE_NAME);
  if (listingsError) {
    throw new Error(`e2e catalog listing delete: ${listingsError.message}`);
  }
  const { error: drivesError } = await admin
    .from("data_catalog_drives")
    .delete()
    .eq("pipeline_name", E2E_CATALOG_PIPELINE_NAME);
  if (drivesError) {
    throw new Error(`e2e catalog drive delete: ${drivesError.message}`);
  }
}

/**
 * Seeds one drive that calls its second organization level "Agency", and the
 * three listings in `E2E_CATALOG_LISTINGS` on it.
 */
async function _seedE2ECatalogFixtures(admin: AdminClient): Promise<void> {
  const { data: drive, error: driveError } = await admin
    .from("data_catalog_drives")
    .insert({
      pipeline_name: E2E_CATALOG_PIPELINE_NAME,
      drive_key: "https://e2e-catalog-filters.example.com",
      organization2_label: "Agency",
    })
    .select("id")
    .single();
  if (driveError) {
    throw new Error(`e2e catalog drive insert: ${driveError.message}`);
  }
  const { error: listingsError } = await admin
    .from("data_catalog_listings")
    .insert(
      E2E_CATALOG_LISTINGS.map((listing) => {
        return {
          access_kind: "pipeline_parquet" as const,
          display_name: listing.displayName,
          organization1_name: listing.organization1Name,
          organization2_name: listing.organization2Name,
          domains: [listing.domain],
          tags: [listing.tag],
          drive_id: drive.id,
          pipeline_name: E2E_CATALOG_PIPELINE_NAME,
          pipeline_run_id: "e2e-run",
          parquet_file_name: `${listing.tag}.parquet`,
        };
      }),
    );
  if (listingsError) {
    throw new Error(`e2e catalog listing insert: ${listingsError.message}`);
  }
}

/**
 * Asserts how many datasets the catalog shows: the count in the results
 * header and the number of rows in the list.
 */
async function _expectNumResults(
  options: Readonly<{ page: Page; numResults: number }>,
): Promise<void> {
  const { page, numResults } = options;
  const results = page.getByRole("region", { name: "Results" });
  await expect(
    results.getByRole("heading", {
      name: new RegExp(`^${numResults} of [\\d,]+ datasets$`),
    }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
  await expect(
    results.getByRole("listbox", { name: "Open datasets" }).getByRole("option"),
  ).toHaveCount(numResults);
}

/**
 * Opens the open data catalog, checks the rail offers Publisher and Keywords
 * before anything is typed, and searches from the tab row for the seeded word.
 */
async function _searchOpenDataCatalog(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<Locator> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tab", { name: "Open data" }).click();
  const rail = page.getByRole("complementary", { name: "Filters" });
  await expect(rail.getByRole("combobox", { name: "Publisher" })).toBeVisible({
    timeout: LONG_WAIT,
  });
  await expect(rail.getByRole("combobox", { name: "Keywords" })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search open data" })
    .fill(E2E_CATALOG_SEARCH_WORD, { timeout: LONG_WAIT });
  await _expectNumResults({ page, numResults: 3 });
  return rail;
}

/**
 * Types part of an option's name into a facet's combobox and picks the
 * option, the way a user narrows a long facet rather than scrolling it.
 */
async function _pickFacetOption(
  options: Readonly<{
    page: Page;
    facet: Locator;
    search: string;
    optionName: RegExp;
  }>,
): Promise<void> {
  const { page, facet, search, optionName } = options;
  await facet.click();
  await facet.fill(search);
  await page.getByRole("option", { name: optionName }).click();
  await facet.press("Escape");
}

/**
 * Opens the taxi listing, checks its Published by group names the agency by
 * its drive's label, and narrows the catalog to its keyword from its chip.
 */
async function _openTaxiListingAndChooseItsKeyword(page: Page): Promise<void> {
  await page
    .getByRole("listbox", { name: "Open datasets" })
    .getByRole("option", { name: /^Quillfeather taxi trips/ })
    .click();
  const detail = page.getByRole("region", { name: "Dataset details" });
  await expect(
    detail.getByRole("heading", { name: "Published by" }),
  ).toBeVisible();
  await expect(detail.getByRole("term")).toContainText(["Agency"]);
  await expect(
    detail.getByRole("definition").filter({ hasText: "E2E Taxi Office" }),
  ).toHaveCount(1);
  await detail
    .getByRole("button", { name: "Show datasets tagged e2e-taxi" })
    .click();
}

test.describe("Open data catalog filters", () => {
  test("narrows the catalog by publisher, agency, and keyword, clearing them restores every match, and a keyword can be picked from the rail", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    // A killed earlier run cannot clean up after itself, so its rows would
    // turn up in this run's search.
    await _deleteE2ECatalogFixtures(admin);
    await _seedE2ECatalogFixtures(admin);

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      const rail = await _searchOpenDataCatalog({
        page,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      // The agency level only means something inside a chosen publisher.
      const agencyFacet = rail.getByRole("combobox", { name: "Agency" });
      await expect(agencyFacet).toHaveCount(0);
      await _pickFacetOption({
        page,
        facet: rail.getByRole("combobox", { name: "Publisher" }),
        search: "e2e ty",
        optionName: /^E2E City\b/,
      });
      await expect(
        rail.getByRole("button", { name: "Remove E2E City" }),
      ).toBeVisible();
      await _expectNumResults({ page, numResults: 2 });

      await _pickFacetOption({
        page,
        facet: agencyFacet,
        search: "taxi",
        optionName: /^E2E Taxi Office\b/,
      });
      await _expectNumResults({ page, numResults: 1 });

      await _openTaxiListingAndChooseItsKeyword(page);
      await expect(
        rail.getByRole("button", { name: "Remove e2e-taxi" }),
      ).toBeVisible();
      await _expectNumResults({ page, numResults: 1 });

      await page
        .getByRole("region", { name: "Results" })
        .getByRole("button", { name: "Clear all" })
        .click();
      await _expectNumResults({ page, numResults: 3 });
      await expect(agencyFacet).toHaveCount(0);
      await expect(
        rail.getByRole("button", { name: "Remove e2e-taxi" }),
      ).toHaveCount(0);

      await _pickFacetOption({
        page,
        facet: rail.getByRole("combobox", { name: "Keywords" }),
        search: "ferry",
        optionName: /^e2e-ferry\b/,
      });
      await _expectNumResults({ page, numResults: 1 });
    } finally {
      await _deleteE2ECatalogFixtures(admin);
    }
  });
});
