import fs from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { stockRequestSchema } from "../../src/stock/contracts/stockRequestSchema/stockRequestSchema";

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
  await page.goto("/motion.html");
  await page
    .getByRole("searchbox", { name: "Search motions" })
    .fill("tradeoff-pivot");
  await page
    .getByRole("button", {
      name: "Explore A choice has two sides",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  const content = dialog.getByRole("region", { name: "Content", exact: true });
  const authoredApproach = "A\nB\tC\nD\nE";
  const authoredPriority = "  e\u0301 👩‍💻\t  tail \n end  ";
  const authoredGain = "  Cafe\u0301\t👨‍👩‍👧‍👦\n  ";
  await content
    .getByRole("textbox", { name: "approach", exact: true })
    .fill(authoredApproach);
  await content
    .getByRole("textbox", { name: "priorityStatement", exact: true })
    .fill(authoredPriority);
  await content
    .getByRole("textbox", { name: "label", exact: true })
    .first()
    .fill(authoredGain);
  await page.evaluate(() => navigator.clipboard.writeText(""));
  await dialog
    .getByRole("button", { name: "Copy configured JSON", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('"preset": "tradeoff-pivot"');
  const copied = JSON.parse(
    await page.evaluate(() => navigator.clipboard.readText()),
  );
  expect(copied.input.approach).toBe(authoredApproach);
  expect(copied.input.priorityStatement).toBe(authoredPriority);
  expect(copied.input.gains[0].label).toBe(authoredGain);
  expect(stockRequestSchema.parse(copied)).toEqual(copied);
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
  await dialog
    .getByRole("button", { name: "Download MP4", exact: true })
    .click();
  await expect
    .poll(() => exportPayload)
    .toEqual({
      id: "stock-tradeoff-pivot",
      options: {
        accent: copied.accent,
        background: copied.background,
        schemaVersion: copied.schemaVersion,
        input: copied.input,
      },
    });
  await content
    .getByRole("textbox", { name: "approach", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "../../.temp/feat-motion-catalog/task-7-editor-whitespace.png",
  });
});

test("native pasted CR and CRLF use LF in copied JSON", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/motion.html");
  await page
    .getByRole("searchbox", { name: "Search motions" })
    .fill("tradeoff-pivot");
  await page
    .getByRole("button", {
      name: "Explore A choice has two sides",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  const approach = dialog.getByRole("textbox", {
    name: "approach",
    exact: true,
  });
  await page.evaluate(() => navigator.clipboard.writeText("A\rB\r\nC\nD\tE"));
  await approach.fill("");
  await approach.press("ControlOrMeta+V");
  await expect(approach).toHaveValue("A\nB\nC\nD\tE");
  await page.evaluate(() => navigator.clipboard.writeText(""));
  await dialog
    .getByRole("button", { name: "Copy configured JSON", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('"preset": "tradeoff-pivot"');
  const copied = JSON.parse(
    await page.evaluate(() => navigator.clipboard.readText()),
  );
  expect(copied.input.approach).toBe("A\nB\nC\nD\tE");
});

test("edited branches keep preview, JSON and download content identical", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) => {
          Reflect.set(window, "copiedMotionJson", value);
        },
      },
    });
  });
  const stylesheet = await request.get("/motion-gallery.css");
  expect(stylesheet.ok()).toBe(true);
  expect(stylesheet.headers()["content-type"]).toContain("text/css");
  let downloadPayload: unknown;
  let contentTransportUrl = "";
  await page.route("**/api/exports", async (route) => {
    downloadPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        state: "complete",
        download: contentTransportUrl,
        message: "Test download ready",
      }),
    });
  });
  await page.emulateMedia({
    reducedMotion: "reduce",
  });
  await page.goto("/motion.html");
  contentTransportUrl = await page.evaluate(() =>
    URL.createObjectURL(
      new Blob(["intercepted transport"], { type: "video/mp4" }),
    ),
  );
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", {
      name: "Play all animations",
    }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", {
      name: "Search motions",
    })
    .fill("decision-fork");
  const opener = page.getByRole("button", {
    name: "Explore Choose one branch",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", {
      name: "Play preview",
      exact: true,
    }),
  ).toBeVisible();
  const content = dialog.getByRole("region", {
    name: "Content",
    exact: true,
  });
  await expect(content).toHaveAttribute("class", /\S+/);
  await expect(content).toHaveCSS("border-top-style", "solid");
  await content
    .getByRole("textbox", {
      name: "Decision prompt",
      exact: true,
    })
    .fill("Which path fits this request?");
  await content
    .getByRole("textbox", {
      name: "Condition",
      exact: true,
    })
    .nth(0)
    .fill("Needs review");
  await content
    .getByRole("textbox", {
      name: "Outcome",
      exact: true,
    })
    .nth(0)
    .fill("Send to reviewer");
  await content
    .getByRole("textbox", {
      name: "Condition",
      exact: true,
    })
    .nth(1)
    .fill("Ready for release");
  await content
    .getByRole("textbox", {
      name: "Outcome",
      exact: true,
    })
    .nth(1)
    .fill("Publish approved work");
  await content
    .getByRole("combobox", {
      name: "Selected branch",
      exact: true,
    })
    .selectOption({ label: "Ready for release" });
  await dialog
    .getByRole("slider", {
      name: "Preview frame",
    })
    .press("Home");
  await dialog
    .getByRole("slider", {
      name: "Preview frame",
    })
    .press("PageUp");
  await expect(dialog.getByRole("img")).toContainText("Publish approved work");
  await content
    .getByRole("button", {
      name: "Remove Branches item 2",
      exact: true,
    })
    .click();
  await expect(
    content.getByRole("combobox", {
      name: "Selected branch",
    }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    dialog.getByRole("button", {
      name: "Download MP4",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", {
      name: "Copy configured JSON",
    }),
  ).toBeDisabled();
  await expect(
    content.getByText("selectedBranchId", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog.getByRole("img")).toContainText("Publish approved work");
  await content
    .getByRole("combobox", {
      name: "Selected branch",
    })
    .selectOption({ label: "Needs review" });
  await dialog
    .getByRole("button", {
      name: "Copy configured JSON",
    })
    .click();
  const copied = await page.evaluate(() =>
    JSON.parse(String(Reflect.get(window, "copiedMotionJson"))),
  );
  expect(stockRequestSchema.parse(copied)).toEqual(copied);
  expect(copied.input.branches).toHaveLength(2);
  expect(copied.input.branches[0].condition).toBe("Needs review");
  expect(copied.input.selectedBranchId).toBe("rough");
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
  await page.evaluate((url) => URL.revokeObjectURL(url), contentTransportUrl);
  await expect.poll(() => downloadPayload).toBeTruthy();
  expect(downloadPayload).toEqual({
    id: "stock-decision-fork",
    options: {
      accent: copied.accent,
      background: copied.background,
      schemaVersion: copied.schemaVersion,
      input: copied.input,
    },
  });
  await content
    .getByRole("button", {
      name: "Reset content",
      exact: true,
    })
    .click();
  await expect(
    content.getByRole("textbox", {
      name: "Decision prompt",
    }),
  ).toHaveValue("Where does the fictional sketch belong?");
  await expect(
    content.getByRole("textbox", {
      name: "Condition",
      exact: true,
    }),
  ).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});
