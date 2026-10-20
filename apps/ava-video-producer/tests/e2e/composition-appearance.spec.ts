import { test, expect } from "@playwright/test";
import { checkDashboardContinuity } from "./helpers/checkDashboardContinuity.mjs";
import { selectAtlasOption } from "./helpers/selectAtlasOption";

test("the dashboard retains all six bars during continuous composition playback", async ({
  page,
  baseURL,
}) => {
  const result = await checkDashboardContinuity(page, baseURL);
  expect(result).toEqual({
    replacements: 0,
    emptyFrames: 0,
    originalChartConnected: true,
  });
});

test("independent roughness levels persist and reach the export request", async ({
  page,
}) => {
  let exportPayload: unknown;
  await page.route("**/api/exports", async (route) => {
    exportPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Intercepted test export" }),
    });
  });
  await page.goto("/compositions.html?film=qetl-composite");
  await selectAtlasOption(page, "Annotation roughness", "Smooth");
  await selectAtlasOption(page, "Box roughness", "Rough");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Annotation roughness", exact: true }),
  ).toHaveValue("Smooth");
  await expect(
    page.getByRole("combobox", { name: "Box roughness", exact: true }),
  ).toHaveValue("Rough");
  await page.getByRole("button", { name: "Download MP4", exact: true }).click();
  await expect
    .poll(() => exportPayload)
    .toMatchObject({
      id: "qetl-composite",
      options: { annotationRoughness: 0, boxRoughness: 3 },
    });
});

["compositions", "films"].forEach((section) => {
  test(`${section} camera presets persist, reach the live player and match exports`, async ({
    page,
  }) => {
    let exportPayload: unknown;
    await page.route("**/api/exports", async (route) => {
      exportPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "Intercepted test export" }),
      });
    });
    await page.goto(`/motion.html?section=${section}`);
    await page.getByRole("button", { name: "Expand preview" }).click();
    const preset = page.getByRole("combobox", {
      name: "Camera motion preset",
      exact: true,
    });
    await expect(preset).toHaveValue("Composition default");
    await selectAtlasOption(page, "Camera motion preset", "Deliberate");
    await expect(
      page.getByRole("button", { name: "Download MP4", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Next preview" }).click();
    await expect(preset).toHaveValue("Deliberate");
    await page.reload();
    await expect(preset).toHaveValue("Deliberate");
    await page
      .getByRole("checkbox", { name: "Camera motion", exact: true })
      .uncheck();
    await expect(preset).toBeDisabled();
    await page
      .getByRole("checkbox", { name: "Camera motion", exact: true })
      .check();
    await selectAtlasOption(page, "Camera motion preset", "Whip");
    await page
      .getByRole("button", { name: "Download MP4", exact: true })
      .click();
    await expect
      .poll(() => exportPayload)
      .toMatchObject({ options: { cameraPreset: "whip", cameraMotion: true } });
  });
});

test("camera preset menus explain settings and feel without changing selection", async ({
  page,
}) => {
  await page.goto("/motion.html?section=compositions");
  await page.getByRole("button", { name: "Expand preview" }).click();
  const dialog = page.getByRole("dialog");
  const preset = dialog.getByRole("combobox", {
    name: "Camera motion preset",
    exact: true,
  });
  await expect(preset).toHaveValue("Composition default");
  await expect(
    page.getByRole("button", { name: "Download MP4", exact: true }),
  ).toBeEnabled();
  await preset.click();
  for (const [label, speed, shutter, feel] of [
    ["Deliberate", "0.25×", "45°", "investigative"],
    ["Gentle", "0.5×", "90°", "instructional"],
    ["Balanced", "0.75×", "120°", "readable"],
    ["Brisk", "1×", "180°", "purposeful"],
    ["Whip", "1.5×", "240°", "energetic"],
  ]) {
    await dialog
      .getByRole("button", { name: `About ${label}`, exact: true })
      .hover();
    const explanation = page.getByRole("tooltip").filter({ hasText: feel });
    await expect(explanation).toBeVisible();
    await expect(page.getByRole("tooltip")).toHaveCount(1);
    await expect(explanation).toContainText(speed);
    await expect(explanation).toContainText(shutter);
  }
  await dialog
    .getByRole("button", { name: "About Deliberate", exact: true })
    .hover();
  const tooltip = page
    .getByRole("tooltip")
    .filter({ hasText: "investigative" });
  await expect(tooltip).toContainText("0.25×");
  await expect(tooltip).toContainText("45°");
  await expect(tooltip).toContainText("ease-in-out");
  await expect(tooltip).toContainText("unfamiliar");
  await page.screenshot({
    path: "../../.temp/feat-motion-catalog/atlas-preset-tooltip.png",
  });
  await dialog
    .getByRole("button", { name: "About Deliberate", exact: true })
    .click();
  await expect(preset).toHaveValue("Composition default");
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "About Gentle", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tooltip").filter({ hasText: "instructional" }),
  ).toBeVisible();
  await expect(preset).toHaveValue("Composition default");
  await dialog.getByRole("option", { name: /^Deliberate/ }).click();
  await expect(preset).toHaveValue("Deliberate");
  await preset.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("listbox")).toHaveCount(0);
  await dialog.getByRole("combobox", { name: "Speed", exact: true }).click();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("listbox")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await page.screenshot({
    path: "../../.temp/feat-motion-catalog/atlas-mantine-controls.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await preset.click();
  await dialog.getByRole("button", { name: "About Whip", exact: true }).hover();
  await expect(
    page.getByRole("tooltip").filter({ hasText: "energetic" }),
  ).toBeVisible();
  await expect(page.getByRole("tooltip")).toHaveCount(1);
  await page.screenshot({
    path: "../../.temp/feat-motion-catalog/atlas-preset-tooltip-mobile.png",
  });
});

test("composition search finds retrieval tags and shows creative direction", async ({
  page,
}) => {
  await page.goto("/motion.html?section=compositions");
  await page
    .getByRole("textbox", { name: "Search compositions" })
    .fill("persistent identity");
  const sidebar = page.getByRole("complementary", {
    name: "Choose a composition",
  });
  await expect(sidebar.getByRole("button")).toHaveCount(1);
  await sidebar.getByRole("button", { name: /Shared-object handoff/ }).click();
  const guide = page.getByRole("region", { name: "Reuse this study" });
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
  await page
    .getByRole("textbox", { name: "Search compositions" })
    .fill("purposeful and traceable");
  await expect(sidebar.getByRole("button")).toHaveCount(1);
  await guide.locator("dl").screenshot({
    path: "../../.temp/feat-motion-catalog/composition-reuse-metadata.png",
  });
});
