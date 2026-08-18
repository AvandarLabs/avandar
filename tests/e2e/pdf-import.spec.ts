import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { FRONTIERS_PERU_PDF_PATH } from "./helpers/constants";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";

/**
 * Copy from `useDatasetImportCopy`, rendered by `ImportStatusCallout` whenever
 * a parse ends with zero rows. A PDF with no region selected also has zero
 * rows, so this callout appearing is exactly the regression this spec guards
 * against.
 */
const PARSE_FAILURE_TITLE = "Data processing failed";
const PARSE_FAILURE_MESSAGE = "No rows were read successfully";

/** Copy from `DatasetPreview` for the PDF needs-selection state. */
const NO_REGION_TITLE = "No region selected yet";
const NO_REGION_MESSAGE = "Select a region on the page to see data";

test.describe("PDF manual upload", () => {
  test("accepts a PDF and holds it in the needs-selection state", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug } = e2eWorkerDb;

    // Geometry sniffing runs in a Web Worker; an exception there would still
    // leave a plausible-looking form, so the run is failed explicitly.
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug,
    });

    await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
      waitUntil: "domcontentloaded",
    });

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(FRONTIERS_PERU_PDF_PATH);
    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    // Reaching this alert proves the dropzone accepted the file, the MIME
    // mapping resolved it to `pdf_file`, and the worker returned geometry.
    await expect(page.getByText(NO_REGION_TITLE)).toBeVisible({
      timeout: LONG_WAIT,
    });
    await expect(
      page.getByText(NO_REGION_MESSAGE, { exact: false }),
    ).toBeVisible({ timeout: SHORT_WAIT });

    // The point of the phase: "no rows yet" is an intermediate state, not a
    // failure. Both halves of the failure callout are asserted so a change to
    // either string cannot make this pass vacuously.
    await expect(page.getByText(PARSE_FAILURE_TITLE)).toBeHidden();
    await expect(page.getByText(PARSE_FAILURE_MESSAGE)).toBeHidden();

    await expect(
      page.getByRole("button", { name: "Save Dataset" }),
    ).toBeDisabled({ timeout: SHORT_WAIT });

    expect(pageErrors).toEqual([]);
  });
});
