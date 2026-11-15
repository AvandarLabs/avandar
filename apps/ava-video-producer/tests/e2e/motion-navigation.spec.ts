import { test, expect } from "@playwright/test";

test("preview arrows follow filtered catalog order and keep the dialog open", async ({
  page,
}) => {
  await page.goto("/motion.html");
  await page.getByRole("searchbox", { name: "Search motions" }).fill("data");
  const cards = page.getByRole("button", { name: /^Explore / });
  const names = await cards.evaluateAll((buttons) =>
    buttons.map((button) =>
      button.getAttribute("aria-label")!.replace(/^Explore /, ""),
    ),
  );
  expect(names.length).toBeGreaterThan(2);
  await cards.first().click();
  const dialog = page.getByRole("dialog");
  const previous = dialog.getByRole("button", {
    name: "Previous motion",
    exact: true,
  });
  const nextMotionButton = dialog.getByRole("button", {
    name: "Next motion",
    exact: true,
  });
  await expect(previous).toBeDisabled();
  await nextMotionButton.click();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(names[1]);
  await expect(nextMotionButton).toBeFocused();
  await expect(dialog).toHaveCount(1);
  await previous.click();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(names[0]);
  await page.keyboard.press("Tab");
  await expect(nextMotionButton).toBeFocused();
  await dialog.getByRole("button", { name: "Close preview" }).click();
  await expect(cards.first()).toBeFocused();
  await cards.last().click();
  await expect(nextMotionButton).toBeDisabled();
  await previous.click();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(
    names.at(-2)!,
  );
});

test("content edits survive navigation and a single search result disables both arrows", async ({
  page,
}) => {
  await page.goto("/motion.html");
  const card = page.getByRole("button", {
    name: "Explore A choice has two sides",
    exact: true,
  });
  await card.click();
  const dialog = page.getByRole("dialog");
  const approach = dialog.getByRole("textbox", {
    name: "approach",
    exact: true,
  });
  await approach.fill("An edited approach");
  await dialog
    .getByRole("button", { name: "Next motion", exact: true })
    .click();
  await expect(page).not.toHaveURL(/#tradeoff-pivot$/);
  await dialog
    .getByRole("button", { name: "Previous motion", exact: true })
    .click();
  await expect(page).toHaveURL(/#tradeoff-pivot$/);
  await expect(approach).toHaveValue("An edited approach");
  await page.keyboard.press("Escape");
  await expect(card).toBeFocused();
  await page
    .getByRole("searchbox", { name: "Search motions" })
    .fill("tradeoff-pivot");
  await card.click();
  await expect(
    dialog.getByRole("button", { name: "Previous motion", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Next motion", exact: true }),
  ).toBeDisabled();
});

test("composition sections share the atlas and offer a fitted keyboard preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/motion.html");
  for (const section of ["Compositions", "Sample films"]) {
    await page.getByRole("link", { name: section, exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Avandar Motion Atlas home" }),
    ).toBeVisible();
    const expand = page.getByRole("button", { name: "Expand preview" });
    await expand.click();
    const dialog = page.getByRole("dialog");
    const title = dialog.getByRole("heading", { level: 2 });
    const firstTitle = await title.textContent();
    await expect(
      dialog.getByRole("button", { name: "Previous preview" }),
    ).toBeDisabled();
    await page.keyboard.press("ArrowRight");
    await expect(title).not.toHaveText(firstTitle!);
    await page.keyboard.press("ArrowLeft");
    await expect(title).toHaveText(firstTitle!);
    await dialog
      .getByRole("checkbox", { name: "Motion blur", exact: true })
      .uncheck();
    const overflow = await dialog.evaluate((element) => ({
      horizontal: element.scrollWidth > element.clientWidth,
      vertical: element.scrollHeight > element.clientHeight,
      controlsOutside: Array.from(
        element.querySelectorAll("button, input, select, iframe"),
      ).some((control) => {
        const bounds = control.getBoundingClientRect();
        return (
          bounds.left < 0 ||
          bounds.top < 0 ||
          bounds.right > innerWidth ||
          bounds.bottom > innerHeight
        );
      }),
    }));
    expect(overflow).toEqual({
      horizontal: false,
      vertical: false,
      controlsOutside: false,
    });
    await expect(
      dialog.getByRole("button", { name: "Download MP4", exact: true }),
    ).toBeEnabled();
    await page.screenshot({
      path: `../../.temp/feat-motion-catalog/atlas-${section.replace(" ", "-")}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(expand).toBeFocused();
  }
});

test("legacy links and filtered composition navigation retain their selection", async ({
  page,
}) => {
  await page.goto("/compositions.html?film=qetl-composite");
  await expect(page).toHaveURL(/motion.html.*film=qetl-composite/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sample films",
  );
  const currentTitle = await page
    .locator("#composition-preview-title")
    .textContent();
  await page
    .getByRole("textbox", { name: "Search compositions" })
    .fill(currentTitle!);
  await page.getByRole("button", { name: "Expand preview" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Previous preview" }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Next preview" }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    dialog.getByRole("checkbox", { name: "Camera motion" }),
  ).toBeInViewport();
  await expect(
    dialog.getByRole("combobox", { name: "Box roughness" }),
  ).toBeInViewport();
  expect(
    await dialog.evaluate(
      (element) =>
        element.scrollHeight <= element.clientHeight &&
        element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await expect(
    dialog.getByRole("button", { name: "Download MP4", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: "../../.temp/feat-motion-catalog/atlas-mobile.png",
  });
});

test("every atlas section retains the shared paper background and ink text", async ({
  page,
}) => {
  await page.goto("/motion.html");
  const atlasTheme = await page.evaluate(() => {
    const theme = getComputedStyle(document.documentElement);
    return {
      background: theme.backgroundColor,
      color: theme.color,
      fontFamily: theme.fontFamily,
    };
  });
  for (const section of ["Compositions", "Sample films", "Motions"]) {
    await page.getByRole("link", { name: section, exact: true }).click();
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      atlasTheme.background,
    );
    await expect(page.locator("body")).toHaveCSS("color", atlasTheme.color);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
      "color",
      atlasTheme.color,
    );
    await expect(page.locator("body")).toHaveCSS(
      "font-family",
      atlasTheme.fontFamily,
    );
  }
});
