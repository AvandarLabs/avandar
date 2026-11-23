import { test, expect } from "@playwright/test";
import { ShowcaseScreenshots } from "../helpers/ShowcaseScreenshots";
import { getDashboardContinuityFromPlayback } from "./helpers/getDashboardContinuityFromPlayback";

test("the dashboard retains all six bars during continuous composition playback", async ({
  page,
  baseURL,
}) => {
  const result = await getDashboardContinuityFromPlayback({
    page,
    baseUrl: baseURL,
  });
  expect(result).toEqual({
    replacements: 0,
    emptyFrames: 0,
    originalChartConnected: true,
  });
});
test("composition search finds retrieval tags and shows creative direction", async ({
  page,
}) => {
  await page.goto("/motion.html?section=compositions");
  const search = page.getByRole("searchbox", { name: "Search compositions" });
  await search.fill("persistent identity");
  const cards = page.getByRole("button", { name: /^Explore / });
  await expect(cards).toHaveCount(1);
  await page
    .getByRole("button", { name: "Explore Shared-object handoff" })
    .click();
  const dialog = page.getByRole("dialog");
  const guide = dialog.getByRole("region", { name: "Reuse this study" });
  await expect(
    guide.getByText("Creative direction", { exact: true }),
  ).toBeVisible();
  await expect(
    guide.getByText("Keywords / tags", { exact: true }),
  ).toBeVisible();
  await expect(guide).toContainText("persistent identity");
  await expect(guide).toContainText(
    "Keep the movement purposeful and traceable",
  );
  await guide.locator("dl").screenshot({
    path: ShowcaseScreenshots.getPathFromFilename({
      filename: "composition-reuse-metadata.png",
    }),
  });
  await page.keyboard.press("Escape");
  await search.fill("purposeful and traceable");
  await expect(cards).toHaveCount(1);
});
test("composition categories filter the cards and count their entries", async ({
  page,
}) => {
  await page.goto("/motion.html?section=compositions");
  const sidebar = page.getByRole("complementary", {
    name: "Composition categories",
  });
  const transitions = sidebar.getByRole("button", { name: /^Transitions/ });
  const count = Number(
    await transitions.locator(".category-count").textContent(),
  );
  await transitions.click();
  await expect(transitions).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/category=transitions/);
  await expect(page.getByRole("button", { name: /^Explore / })).toHaveCount(
    count,
  );
});
