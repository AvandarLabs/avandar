import { test, expect } from "@playwright/test";
import { MotionContentDownloadAssertions } from "./MotionContentDownloadAssertions";
import { MotionContentEditorSteps } from "./MotionContentEditorSteps";

const AUTHORED_WHITESPACE = {
  authoredApproach: "A\nB\tC\nD\nE",
  authoredPriority: "  e\u0301 👩‍💻\t  tail \n end  ",
  authoredGain: "  Cafe\u0301\t👨‍👩‍👧‍👦\n  ",
};

test("authored whitespace stays exact in native copied JSON and export input", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  let exportPayload: unknown;
  // Intercept transport only. This test does not render or verify an MP4.
  await page.route("**/api/exports", async (route) => {
    exportPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Intercepted test export" }),
    });
  });
  const { dialog, content } =
    await MotionContentEditorSteps.openTradeoffContentEditor(page);

  await MotionContentEditorSteps.fillAuthoredWhitespace({
    ...AUTHORED_WHITESPACE,
    content,
  });
  const { copied } =
    await MotionContentDownloadAssertions.copyAndAssertWhitespaceRequest({
      ...AUTHORED_WHITESPACE,
      page,
      dialog,
    });
  await MotionContentDownloadAssertions.assertWhitespacePreviewLabels({
    ...AUTHORED_WHITESPACE,
    dialog,
  });
  await MotionContentDownloadAssertions.assertWhitespaceExportInput({
    dialog,
    copied,
    getExportPayload: () => {
      return exportPayload;
    },
  });
  await MotionContentDownloadAssertions.captureWhitespaceEditor({
    page,
    content,
  });
});

test("native pasted CR and CRLF use LF in copied JSON", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { dialog } =
    await MotionContentEditorSteps.openTradeoffContentEditor(page);
  const approach = dialog.getByRole("textbox", {
    name: "approach",
    exact: true,
  });
  await page.evaluate(() => {
    return navigator.clipboard.writeText("A\rB\r\nC\nD\tE");
  });
  await approach.fill("");
  await approach.press("ControlOrMeta+V");
  await expect(approach).toHaveValue("A\nB\nC\nD\tE");
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
  expect(copied.input.approach).toBe("A\nB\nC\nD\tE");
});

test("edited branches keep preview, JSON and download content identical", async ({
  page,
  request,
}) => {
  const transport = await MotionContentEditorSteps.prepareDecisionForkTransport(
    {
      page,
      request,
    },
  );
  const { opener, dialog, content } =
    await MotionContentEditorSteps.openDecisionForkEditor(page);
  await MotionContentEditorSteps.fillDecisionForkText(content);
  await MotionContentEditorSteps.assertConfiguredBranchPreview({
    content,
    dialog,
  });
  await MotionContentEditorSteps.assertInvalidSelectedBranch({
    content,
    dialog,
  });
  const { copied } = await MotionContentEditorSteps.copySelectedDecisionFork({
    page,
    dialog,
    content,
  });
  await MotionContentDownloadAssertions.assertConfiguredDownloadTransport({
    page,
    dialog,
    copied,
    ...transport,
  });
  await MotionContentEditorSteps.assertContentResetAndDialogFocus({
    page,
    dialog,
    content,
    opener,
  });
});
