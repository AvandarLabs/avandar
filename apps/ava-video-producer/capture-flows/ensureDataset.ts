import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { closeChat } from "./closeChat";
import { getRecordIdFromPageUrl } from "./getRecordIdFromPageUrl";
import type { FlowContext, FlowRecord } from "./captureFlows.types";
/** The fixture datasets the flows import, by fixture file name. */
const FIXTURE_NAMES: Readonly<Record<string, string>> = {
  cases: "Video - Harborfield cases",
  visits: "Video - Harborfield visits",
  facilities: "Video - Harborfield facilities",
  districts: "Video - Harborfield districts",
  weekly_reports: "Video - Harborfield weekly reports",
};
/** One fixture upload: its file key, dataset name, and how to run it. */
type FixtureUpload = {
  key: string;
  name: string;
  doesDatasetExist: boolean;
  shouldDemonstrate: boolean;
};
function _createDatasetRoutePattern(workspace: string): RegExp {
  return new RegExp(`/${workspace}/data-manager/[0-9a-f-]+$`);
}
/** Opens the data sources list, waiting until every dataset link has loaded. */
async function _openSourceList({
  context,
  shouldShowImport = false,
}: Readonly<{
  context: Readonly<FlowContext>;
  shouldShowImport?: boolean;
}>): Promise<void> {
  const { page, baseUrl, workspace } = context;
  await page.goto(
    `${baseUrl}/${workspace}/data-manager${shouldShowImport ? "/data-import" : ""}`,
  );
  await page
    .getByRole("heading", { name: "Data Sources", exact: true })
    .waitFor();
  if (shouldShowImport) {
    await page.getByRole("tabpanel", { name: "Upload", exact: true }).waitFor();
  }
  // The visible count is absent while loading, including when cached
  // requests do not fire.
  const datasetCountText = page
    .getByRole("heading", { name: "All data", exact: true })
    .locator("..")
    .locator("p");
  await expect(datasetCountText).toHaveText(/^\d+$/);
  await expect(
    page.locator(
      `a[href^="/${workspace}/data-manager/"]:not([href$="/data-import"])`,
    ),
  ).toHaveCount(Number(await datasetCountText.innerText()));
  await closeChat(page);
}
/**
 * Closes the dataset-limit dialog when previewing a dataset that already
 * exists, and refuses a new upload the workspace has no room for.
 */
async function _dismissDatasetLimit({
  page,
  doesDatasetExist,
}: Readonly<{
  page: Page;
  doesDatasetExist: boolean;
}>): Promise<void> {
  const datasetLimitDialog = page
    .getByRole("dialog")
    .filter({ hasText: "Dataset limit reached" });
  if (!(await datasetLimitDialog.count())) {
    return;
  }
  if (!doesDatasetExist) {
    throw new Error(
      "Local workspace dataset limit reached. Use a workspace with capacity; existing data was preserved.",
    );
  }
  // Previewing an already saved input does not create another dataset.
  await page.keyboard.press("Escape");
  await expect(datasetLimitDialog).not.toBeVisible();
}
/** Uploads a fixture CSV and fills its name and description, ready to save. */
async function _uploadFixture({
  context,
  options,
}: Readonly<{
  context: Readonly<FlowContext>;
  options: Readonly<FixtureUpload>;
}>): Promise<void> {
  const { page, workspace } = context;
  if (!options.shouldDemonstrate) {
    await page.goto(`${context.baseUrl}/${workspace}/data-manager/data-import`);
    await page.getByRole("tabpanel", { name: "Upload", exact: true }).waitFor();
  }
  await page
    .getByRole("tabpanel", { name: "Upload", exact: true })
    .locator('input[type="file"]')
    .setInputFiles(path.join(context.fixtureDir, `${options.key}.csv`));
  await page
    .getByPlaceholder("Enter a name for this dataset")
    .waitFor({ timeout: 30000 });
  await page
    .getByPlaceholder("Enter a name for this dataset")
    .fill(options.name);
  await page
    .getByPlaceholder("What is in this dataset?")
    .fill(
      "Fictional Harborfield response-coordination data. Reproducible fixtures from avandar-video-agent/demo-data.",
    );
  await page.getByPlaceholder("What is in this dataset?").press("Tab");
  await _dismissDatasetLimit({
    page,
    doesDatasetExist: options.doesDatasetExist,
  });
  await expect(
    page.getByRole("button", { name: "Save Dataset", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
}
/** Saves a new upload, or opens the existing dataset with the same name. */
async function _saveOrReuseDataset({
  context,
  options,
}: Readonly<{
  context: Readonly<FlowContext>;
  options: Readonly<{
    stepKey: string;
    name: string;
    doesDatasetExist: boolean;
  }>;
}>): Promise<void> {
  const { page, workspace } = context;
  const existingDatasetLink = page.getByRole("link", {
    name: options.name,
    exact: true,
  });
  if (!options.doesDatasetExist) {
    await context.step(`save-${options.stepKey}`, async () => {
      await page
        .getByRole("button", { name: "Save Dataset", exact: true })
        .click();
      await page.waitForURL(_createDatasetRoutePattern(workspace), {
        timeout: 30000,
      });
      await page.getByText(options.name, { exact: true }).last().waitFor();
    });
    return;
  }
  await context.step(`reuse-${options.stepKey}`, async () => {
    await existingDatasetLink.click();
    await page.waitForURL(_createDatasetRoutePattern(workspace));
  });
}
/** Uploads (or previews) and saves or reuses one fixture dataset. */
async function _importFixture({
  context,
  options,
}: Readonly<{
  context: FlowContext;
  options: Readonly<Pick<FixtureUpload, "key" | "name" | "shouldDemonstrate">>;
}>): Promise<void> {
  const { page } = context;
  const existingDatasetLink = page.getByRole("link", {
    name: options.name,
    exact: true,
  });
  if ((await existingDatasetLink.count()) > 1) {
    throw new Error(`Duplicate fixture dataset name: ${options.name}`);
  }
  const doesDatasetExist = (await existingDatasetLink.count()) > 0;
  const stepKey = options.key.replaceAll("_", "-");
  if (doesDatasetExist && !options.shouldDemonstrate) {
    await existingDatasetLink.click();
    await page.waitForURL(_createDatasetRoutePattern(context.workspace));
    return;
  }
  await context.step(`upload-${stepKey}`, async () => {
    await _uploadFixture({
      context,
      options: { ...options, doesDatasetExist },
    });
  });
  if (options.shouldDemonstrate) {
    await page
      .getByText("Dataset ready", { exact: true })
      .waitFor({ state: "hidden", timeout: 15000 });
    await context.checkpoint("import-preview");
  }
  await _saveOrReuseDataset({
    context,
    options: {
      stepKey,
      name: options.name,
      doesDatasetExist,
    },
  });
}
/**
 * Makes sure a fixture dataset exists, uploading it on first use, and caches
 * it on the run state so later flows reuse it. It reuses the fixture datasets
 * it already uploaded and never deletes or edits unrelated local data.
 *
 * Called by the import flow in `AvandarCaptureFlows` and by
 * `ensureFixtureDataset`, which serves the explorer, cases, and map flows.
 */
export async function ensureDataset({
  context,
  key,
  shouldDemonstrate = false,
}: Readonly<{
  context: FlowContext;
  key: string;
  shouldDemonstrate?: boolean;
}>): Promise<FlowRecord> {
  const { page, state } = context;
  state.datasets ??= {};
  const name = FIXTURE_NAMES[key];
  if (!name) {
    throw new Error(`Unknown fixture: ${key}`);
  }
  await _openSourceList({ context, shouldShowImport: shouldDemonstrate });
  await _importFixture({
    context,
    options: { key, name, shouldDemonstrate },
  });
  const id = getRecordIdFromPageUrl({
    page,
    segment: "data-manager",
  });
  state.datasets[key] = { id, name };
  await context.recordResource?.({ kind: "dataset", id, name });
  if (shouldDemonstrate) {
    await page.getByRole("tab", { name: "Metadata", exact: true }).waitFor();
    await expect(page.getByRole("main")).toContainText("240 rows");
    await context.checkpoint("import-saved");
  }
  return state.datasets[key];
}
