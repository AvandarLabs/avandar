import fs from "node:fs/promises";
import { expect, type Page, type Locator } from "@playwright/test";
import { stockRequestSchema } from "../../../src/stock/contracts/stockRequestSchema/stockRequestSchema";
import { ShowcaseScreenshots } from "../../helpers/ShowcaseScreenshots";

async function _copyAndAssertWhitespaceRequest({
  page,
  dialog,
  authoredApproach,
  authoredPriority,
  authoredGain,
}: Readonly<{
  page: Page;
  dialog: Locator;
  authoredApproach: string;
  authoredPriority: string;
  authoredGain: string;
}>): Promise<
  Readonly<{
    copied: Extract<
      ReturnType<typeof stockRequestSchema.parse>,
      { preset: "tradeoff-pivot" }
    >;
  }>
> {
  await page.evaluate(() => {
    return navigator.clipboard.writeText("");
  });
  await dialog
    .getByRole("button", { name: "Copy configured JSON", exact: true })
    .click();
  await expect
    .poll(() => {
      return page.evaluate(() => {
        return navigator.clipboard.readText();
      });
    })
    .toContain('"preset": "tradeoff-pivot"');
  const copied = JSON.parse(
    await page.evaluate(() => {
      return navigator.clipboard.readText();
    }),
  );
  expect(copied.input.approach).toBe(authoredApproach);
  expect(copied.input.priorityStatement).toBe(authoredPriority);
  expect(copied.input.gains[0].label).toBe(authoredGain);
  expect(stockRequestSchema.parse(copied)).toEqual(copied);
  return { copied };
}

async function _assertWhitespacePreviewLabels({
  dialog,
  authoredApproach,
  authoredPriority,
}: Readonly<{
  dialog: Locator;
  authoredApproach: string;
  authoredPriority: string;
}>): Promise<void> {
  await expect(
    dialog
      .getByRole("img")
      .getByLabel(authoredApproach, { exact: true })
      .first(),
  ).toHaveAttribute("aria-label", authoredApproach);
  await expect(
    dialog
      .getByRole("img")
      .getByLabel(authoredPriority, { exact: true })
      .first(),
  ).toHaveAttribute("aria-label", authoredPriority);
}

async function _assertConfiguredDownloadTransport({
  page,
  dialog,
  copied,
  contentTransportUrl,
  getDownloadPayload,
}: Readonly<{
  page: Page;
  dialog: Locator;
  copied: Readonly<{ schemaVersion: number; input: unknown }>;
  contentTransportUrl: string;
  getDownloadPayload: () => unknown;
}>): Promise<void> {
  const downloadStarted = page.waitForEvent("download", { timeout: 5000 });
  await dialog
    .getByRole("button", {
      name: "Download MP4",
      exact: true,
    })
    .click();
  const completedDownload = await downloadStarted;
  expect(await completedDownload.failure()).toBeNull();
  const downloadedFile = await completedDownload.path();
  expect(downloadedFile).not.toBeNull();
  expect(await fs.readFile(downloadedFile!, "utf8")).toBe(
    "intercepted transport",
  );
  await page.evaluate((url) => {
    return URL.revokeObjectURL(url);
  }, contentTransportUrl);
  await expect
    .poll(() => {
      return getDownloadPayload();
    })
    .toBeTruthy();
  expect(getDownloadPayload()).toEqual({
    id: "stock-decision-fork",
    options: {
      schemaVersion: copied.schemaVersion,
      input: copied.input,
      theme: { id: "classic" },
    },
  });
}

async function _assertWhitespaceExportInput({
  dialog,
  copied,
  getExportPayload,
}: Readonly<{
  dialog: Locator;
  copied: Readonly<{ schemaVersion: number; input: unknown }>;
  getExportPayload: () => unknown;
}>): Promise<void> {
  await dialog
    .getByRole("button", { name: "Download MP4", exact: true })
    .click();
  await expect
    .poll(() => {
      return getExportPayload();
    })
    .toEqual({
      id: "stock-tradeoff-pivot",
      options: {
        schemaVersion: copied.schemaVersion,
        input: copied.input,
        // The export renders with the gallery's saved video theme, not the
        // copied request's accent and background.
        theme: { id: "classic" },
      },
    });
}

async function _captureWhitespaceEditor({
  page,
  content,
}: Readonly<{ page: Page; content: Locator }>): Promise<void> {
  await content
    .getByRole("textbox", { name: "approach", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ShowcaseScreenshots.getPathFromFilename({
      filename: "task-7-editor-whitespace.png",
    }),
  });
}

/** Browser steps shared by the motion content editor contract. */
export const MotionContentDownloadAssertions = {
  /** Copy and assert whitespace request through the browser. */
  copyAndAssertWhitespaceRequest: _copyAndAssertWhitespaceRequest,
  /** Assert whitespace preview labels through the browser. */
  assertWhitespacePreviewLabels: _assertWhitespacePreviewLabels,
  /** Assert configured download transport through the browser. */
  assertConfiguredDownloadTransport: _assertConfiguredDownloadTransport,
  /** Assert whitespace export input through the browser. */
  assertWhitespaceExportInput: _assertWhitespaceExportInput,
  /** Capture whitespace editor through the browser. */
  captureWhitespaceEditor: _captureWhitespaceEditor,
};
