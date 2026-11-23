import { test, expect, type Locator, type Page } from "@playwright/test";
import { getFilteredMotionNames } from "../helpers/getFilteredMotionNames";
import { ShowcaseScreenshots } from "../helpers/ShowcaseScreenshots";

test("preview arrows follow filtered catalog order and keep the dialog open", async ({
  page,
}) => {
  await page.goto("/motion.html");
  const names = await getFilteredMotionNames({ page, query: "data" });
  const cards = page.getByRole("button", { name: /^Explore / });
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
    const expand = page.getByRole("button", { name: /^Explore / }).first();
    await expand.click();
    const dialog = page.getByRole("dialog");
    await _returnToFirstCompositionPreview({ page, dialog });
    await expect(
      dialog.getByRole("button", { name: "Download MP4", exact: true }),
    ).toBeEnabled();
    await dialog
      .getByRole("checkbox", { name: "Motion blur", exact: true })
      .uncheck();
    await _assertPreviewFitsViewport(dialog);
    await expect(
      dialog.getByRole("button", { name: "Download MP4", exact: true }),
    ).toBeEnabled();
    await page.screenshot({
      path: ShowcaseScreenshots.getPathFromFilename({
        filename: `atlas-${section.replace(" ", "-")}.png`,
      }),
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
  await expect(
    page.getByRole("link", { name: "Sample films", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const dialog = page.getByRole("dialog");
  const filmUrl = await _getFilmApiUrl({ page, dialog });
  const currentTitle = await dialog
    .getByRole("heading", { level: 2 })
    .first()
    .textContent();
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/film=/);
  await page
    .getByRole("searchbox", { name: "Search films" })
    .fill(currentTitle!);
  await _waitForFilmAfterAction({
    page,
    filmUrl,
    action: () => {
      return page
        .getByRole("button", { name: `Explore ${currentTitle}` })
        .click();
    },
  });
  await expect(page).toHaveURL(/film=qetl-composite/);
  await expect(
    dialog.getByRole("button", { name: "Previous preview" }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Next preview" }),
  ).toBeDisabled();
  await _assertMobilePreviewFits({ page, dialog });
  await expect(
    dialog.getByRole("button", { name: "Download MP4", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: ShowcaseScreenshots.getPathFromFilename({
      filename: "atlas-mobile.png",
    }),
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

test("helpers browse by category as live cards and open in the shared preview", async ({
  page,
}) => {
  await page.goto("/motion.html?section=helpers");
  const sidebar = page.getByRole("complementary", {
    name: "Helper categories",
  });
  const masks = sidebar.getByRole("button", { name: /^Masks and wipes/ });
  const count = Number(await masks.locator(".category-count").textContent());
  await masks.click();
  const cards = page.getByRole("button", { name: /^Explore / });
  await expect(cards).toHaveCount(count);
  await page.getByRole("button", { name: "Explore Erase mask" }).click();
  await expect(page).toHaveURL(/helper=erase-mask/);
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Erase mask", level: 2 }).first(),
  ).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveAttribute(
    "src",
    /id=helper-erase-mask/,
  );
  await page.keyboard.press("ArrowRight");
  await expect(page).not.toHaveURL(/helper=erase-mask/);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).not.toHaveURL(/helper=/);
});

async function _assertPreviewFitsViewport(dialog: Locator): Promise<void> {
  const overflow = await dialog.evaluate((element) => {
    return {
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
    };
  });
  expect(overflow).toEqual({
    horizontal: false,
    vertical: false,
    controlsOutside: false,
  });
}

/** Gets the film API URL from the selected preview's guarded iframe source. */
async function _getFilmApiUrl({
  page,
  dialog,
}: Readonly<{ page: Page; dialog: Locator }>): Promise<string> {
  const source = await dialog.locator("iframe").getAttribute("src");
  if (!source) {
    throw new Error("The preview iframe has no source");
  }
  const iframeUrl = new URL(source, page.url());
  const filmId = iframeUrl.searchParams.get("id");
  if (
    !filmId ||
    iframeUrl.origin !== new URL(page.url()).origin ||
    iframeUrl.pathname !== "/live.html"
  ) {
    throw new Error("The preview iframe has no local film selection");
  }
  return new URL(`/api/films/${encodeURIComponent(filmId)}`, iframeUrl).href;
}

/** Waits for the film requested by an action, including cold narration work. */
async function _waitForFilmAfterAction({
  page,
  filmUrl,
  action,
}: Readonly<{
  page: Page;
  filmUrl: string;
  action: () => Promise<unknown>;
}>): Promise<void> {
  await Promise.all([
    page.waitForResponse((response) => {
      const request = response.request();
      return (
        response.url() === filmUrl &&
        request.method() === "GET" &&
        !request.frame().isDetached() &&
        request.frame().parentFrame() === page.mainFrame() &&
        response.ok()
      );
    }),
    action(),
  ]);
}

async function _returnToFirstCompositionPreview({
  page,
  dialog,
}: Readonly<{ page: Page; dialog: Locator }>): Promise<void> {
  const title = dialog.getByRole("heading", { level: 2 });
  const firstTitle = await title.textContent();
  if (!firstTitle) {
    throw new Error("The preview has no composition title");
  }
  const filmUrl = await _getFilmApiUrl({ page, dialog });
  await expect(
    dialog.getByRole("button", { name: "Previous preview" }),
  ).toBeDisabled();
  await page.keyboard.press("ArrowRight");
  await expect(title).not.toHaveText(firstTitle);
  await _waitForFilmAfterAction({
    page,
    filmUrl,
    action: () => {
      return page.keyboard.press("ArrowLeft");
    },
  });
  await expect(title).toHaveText(firstTitle);
}

async function _assertMobilePreviewFits({
  page,
  dialog,
}: Readonly<{ page: Page; dialog: Locator }>): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    dialog.getByRole("checkbox", { name: "Camera motion" }),
  ).toBeInViewport();
  // The dialog scrolls vertically at phone widths, like the Motions dialog.
  expect(
    await dialog.evaluate((element) => {
      return element.scrollWidth <= element.clientWidth;
    }),
  ).toBe(true);
}
