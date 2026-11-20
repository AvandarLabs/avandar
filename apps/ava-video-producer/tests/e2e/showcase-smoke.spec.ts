import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test, type FrameLocator, type Page } from "@playwright/test";

/**
 * Screenshots land in the repo's ignored `.temp/<branch>/` folder, where
 * `<branch>` is the current git branch in kebab-case (`local` when there is
 * no branch). A subfolder named by `SHOWCASE_SCREENSHOT_LABEL` keeps two runs
 * apart so they can be compared by eye.
 */
const SCREENSHOT_DIRECTORY = path.resolve(
  import.meta.dirname,
  "../../../../.temp",
  _buildBranchFolderName(),
  process.env.SHOWCASE_SCREENSHOT_LABEL ?? "latest",
);

/** Builds the kebab-case folder name for the current git branch. */
function _buildBranchFolderName(): string {
  const branch = execFileSync("git", ["branch", "--show-current"], {
    cwd: import.meta.dirname,
    encoding: "utf8",
  });
  const folderName = branch
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return folderName || "local";
}

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
    timeout: 30_000,
  });
  await expect(player.locator("#root > .live-error")).toHaveCount(0);
  await expect(player.locator("#load-error")).toBeHidden();
}

async function _capture(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIRECTORY, `${name}.png`),
    fullPage: true,
  });
}

test("the home page mounts its live player without console errors", async ({
  page,
}) => {
  const errors = _collectPageErrors(page);
  await page.goto("/");
  await _expectPlayerMounted(page.frameLocator("#player"));
  await _capture(page, "index");
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
  await _capture(page, "productions");
  expect(errors).toEqual([]);
});

test("the live page mounts a film player without console errors", async ({
  page,
}) => {
  const errors = _collectPageErrors(page);
  await page.goto("/live.html?id=title-study");
  await expect(page.locator("#root > .live-error")).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(page.locator("#load-error")).toBeHidden();
  await _capture(page, "live");
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
  await _capture(page, "motion");
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
  await _capture(page, "compositions");
  expect(errors).toEqual([]);
});
