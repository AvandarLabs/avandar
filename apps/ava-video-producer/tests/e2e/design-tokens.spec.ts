import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Editing design tokens from the Atlas modals. Drafts live in each test's
 * fresh browser storage. The one file a test creates is deleted in `finally`.
 */

const THEMES_DIRECTORY = path.join(process.cwd(), "themes");

async function _openFirstMotionTokens(page: Page): Promise<Locator> {
  await page.goto("/motion.html");
  await page
    .getByRole("button", { name: /^Explore / })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Design tokens" }).click();
  return dialog;
}

async function _openSharedObjectHandoffTokens(page: Page): Promise<Locator> {
  await page.goto("/motion.html?section=compositions");
  await page
    .getByRole("button", { name: "Explore Shared-object handoff" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Design tokens" }).click();
  return dialog;
}

async function _setEssentialAccent(
  dialog: Locator,
  color: string,
): Promise<void> {
  const accent = dialog
    .getByRole("region", { name: "Look and feel" })
    .locator('[data-token-path="color.accent"]');
  await accent.getByRole("button", { name: "Custom value for Accent" }).click();
  const input = accent.getByRole("textbox", { name: "Custom Accent" });
  await input.fill(color);
  await input.press("Enter");
}

function _strokesIn(scope: Locator, color: string): Locator {
  return scope.locator(`svg [stroke="${color}"]`);
}

test("changing the accent in Look and feel updates a motion thumbnail and the modal player", async ({
  page,
}) => {
  const dialog = await _openFirstMotionTokens(page);
  await _setEssentialAccent(dialog, "#ff0000");
  await expect(
    _strokesIn(dialog.locator(".dialog-canvas"), "#ff0000").first(),
  ).toBeAttached();
  await expect(
    _strokesIn(page.locator(".motion-card").first(), "#ff0000").first(),
  ).toBeAttached();
});

test("a theme-scope accent edit recolours a composition's live player", async ({
  page,
}) => {
  const dialog = await _openSharedObjectHandoffTokens(page);
  await _setEssentialAccent(dialog, "#ff00ff");
  await expect(
    page
      .frameLocator("iframe")
      .locator('[stroke="#ff00ff"], [fill="#ff00ff"]')
      .first(),
  ).toBeAttached();
});

test("an item override changes only that item, and its reset clears it", async ({
  page,
}) => {
  const dialog = await _openFirstMotionTokens(page);
  await dialog.getByText("This motion only", { exact: true }).click();
  await _setEssentialAccent(dialog, "#00ff00");
  const cards = page.locator(".motion-card");
  await expect(
    _strokesIn(dialog.locator(".dialog-canvas"), "#00ff00").first(),
  ).toBeAttached();
  await expect(_strokesIn(cards.nth(0), "#00ff00").first()).toBeAttached();
  await expect(cards.nth(1).locator("svg").first()).toBeAttached();
  await expect(_strokesIn(cards.nth(1), "#00ff00")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Reset Accent" }).first().click();
  await expect(
    _strokesIn(dialog.locator(".dialog-canvas"), "#00ff00"),
  ).toHaveCount(0);
});

test("save as new theme writes a theme file", async ({ page }) => {
  const label = `E2E temporary ${Date.now()}`;
  const file = path.join(
    THEMES_DIRECTORY,
    `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.theme.json`,
  );
  try {
    const dialog = await _openFirstMotionTokens(page);
    await _setEssentialAccent(dialog, "#123456");
    await dialog.getByRole("button", { name: "Save as new theme" }).click();
    await dialog.getByRole("textbox", { name: "New theme name" }).fill(label);
    await dialog.getByRole("button", { name: "Create theme" }).click();
    await expect
      .poll(() =>
        fs.access(file).then(
          () => true,
          () => false,
        ),
      )
      .toBe(true);
    expect(JSON.parse(await fs.readFile(file, "utf8"))).toMatchObject({
      extends: "classic",
      label,
    });
  } finally {
    await fs.rm(file, { force: true });
  }
});

test("a draft survives a reload", async ({ page }) => {
  let dialog = await _openFirstMotionTokens(page);
  await _setEssentialAccent(dialog, "#abcdef");
  await expect(dialog.getByText("Unsaved changes")).toBeVisible();
  await page.reload();
  dialog = page.getByRole("dialog");
  const tokensTab = dialog.getByRole("tab", { name: "Design tokens" });
  // The reopened modal can remount once after load and drop an early click.
  await expect(async () => {
    await tokensTab.click();
    await expect(tokensTab).toHaveAttribute("aria-selected", "true", {
      timeout: 1000,
    });
  }).toPass({ timeout: 10000 });
  await expect(dialog.getByText("Unsaved changes")).toBeVisible();
  await expect(
    _strokesIn(dialog.locator(".dialog-canvas"), "#abcdef").first(),
  ).toBeAttached();
});

test("a download waits for the player to acknowledge the theme, then carries it", async ({
  page,
}) => {
  let exportPayload: unknown;
  let releaseFilm = () => {};
  const filmHeld = new Promise<void>((resolve) => {
    releaseFilm = resolve;
  });
  await page.route("**/api/films/shared-object-handoff", async (route) => {
    await filmHeld;
    await route.continue();
  });
  await page.route("**/api/exports", async (route) => {
    exportPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Intercepted test export" }),
    });
  });
  const dialog = await _openSharedObjectHandoffTokens(page);
  await _setEssentialAccent(dialog, "#ff00ff");
  await dialog.getByRole("tab", { name: "Details" }).click();
  await expect(
    dialog.getByRole("button", {
      name: /^(Loading preview…|Applying design tokens…)$/,
    }),
  ).toBeDisabled();
  releaseFilm();
  const download = dialog.getByRole("button", {
    name: "Download MP4",
    exact: true,
  });
  await expect(download).toBeEnabled();
  await download.click();
  await expect
    .poll(() => exportPayload)
    .toMatchObject({
      id: "shared-object-handoff",
      options: {
        theme: {
          id: "classic",
          patch: {
            other: {
              video: {
                atomic: { swatch: { customColorAccent: "#ff00ff" } },
                semantic: {
                  color: { accent: "$atomic.swatch.customColorAccent" },
                },
              },
            },
          },
        },
      },
    });
});

test("the captions button posts the export's theme to /api/captions", async ({
  page,
}) => {
  let captionsPayload: unknown;
  await page.route("**/api/captions", async (route) => {
    captionsPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "1\n00:00:00,000 --> 00:00:01,000\nTest caption\n",
    });
  });
  const dialog = await _openSharedObjectHandoffTokens(page);
  await _setEssentialAccent(dialog, "#ff00ff");
  await dialog.getByRole("tab", { name: "Details" }).click();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Captions", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "shared-object-handoff-captions.srt",
  );
  expect(captionsPayload).toMatchObject({
    id: "shared-object-handoff",
    options: {
      theme: {
        id: "classic",
        patch: {
          other: {
            video: {
              semantic: {
                color: { accent: "$atomic.swatch.customColorAccent" },
              },
            },
          },
        },
      },
    },
  });
});

test("built-in themes offer only Save as new theme", async ({ page }) => {
  const dialog = await _openFirstMotionTokens(page);
  await expect(
    dialog.getByRole("button", { name: "Save as new theme" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toHaveCount(0);
});
