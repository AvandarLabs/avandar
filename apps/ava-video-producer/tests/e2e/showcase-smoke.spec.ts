import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { ShowcaseScreenshots } from "../helpers/ShowcaseScreenshots";
/** Collects console errors and uncaught page errors from every frame. */
function _collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`${message.location().url}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}
/** Waits until a live player replaced its loading text with the film. */
async function _expectPlayerMounted(player: FrameLocator): Promise<void> {
  await expect(player.locator("#root > .liveFilm")).toBeVisible({
    timeout: 30000,
  });
  await expect(player.locator("#root > .live-error")).toHaveCount(0);
  await expect(player.locator("#load-error")).toBeHidden();
}
async function _capture({
  page,
  name,
}: Readonly<{
  page: Page;
  name: string;
}>): Promise<void> {
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: ShowcaseScreenshots.getPathFromFilename({
      filename: `${name}.png`,
      label: process.env.SHOWCASE_SCREENSHOT_LABEL ?? "latest",
    }),
    fullPage: true,
  });
}
test("the home page mounts its live player without console errors", async ({
  page,
}) => {
  const errors = _collectPageErrors(page);
  await page.goto("/");
  await _expectPlayerMounted(page.frameLocator("#player"));
  await _capture({
    page,
    name: "index",
  });
  expect(errors).toEqual([]);
});
test("the productions page mounts every live player without console errors", async ({
  page,
}) => {
  const errors = _collectPageErrors(page);
  await page.goto("/productions.html");
  const players = page.locator(".production-card iframe");
  const playerCount = await players.count();
  expect(playerCount).toBeGreaterThan(0);
  for (let index = 0; index < playerCount; index += 1) {
    await players.nth(index).scrollIntoViewIfNeeded();
    await _expectPlayerMounted(
      page.frameLocator(`.production-card >> nth=${index} >> iframe`),
    );
  }
  await _capture({
    page,
    name: "productions",
  });
  expect(errors).toEqual([]);
});
test("the live page mounts a film player without console errors", async ({
  page,
}) => {
  const errors = _collectPageErrors(page);
  await page.goto("/live.html?id=title-study");
  await expect(page.locator("#root > .live-error")).toHaveCount(0, {
    timeout: 30000,
  });
  await expect(page.locator("#load-error")).toBeHidden();
  await _capture({
    page,
    name: "live",
  });
  expect(errors).toEqual([]);
});
test("the Motion Atlas mounts its gallery without console errors", async ({
  page,
}) => {
  const errors = _collectPageErrors(page);
  await page.goto("/motion.html");
  await expect(
    page.getByRole("searchbox", { name: "Search motions" }),
  ).toBeVisible();
  await _capture({
    page,
    name: "motion",
  });
  expect(errors).toEqual([]);
});
test("the compositions page opens the Motion Atlas compositions section", async ({
  page,
}) => {
  const errors = _collectPageErrors(page);
  await page.goto("/compositions.html");
  await expect(page).toHaveURL(/\/motion\.html\?section=compositions$/);
  await expect(
    page.getByRole("searchbox", { name: "Search compositions" }),
  ).toBeVisible();
  await _capture({
    page,
    name: "compositions",
  });
  expect(errors).toEqual([]);
});
