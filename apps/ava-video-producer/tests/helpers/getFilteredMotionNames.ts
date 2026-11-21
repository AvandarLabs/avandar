import { expect, type Page } from "@playwright/test";
import { STOCK_CATALOG } from "../../src/stock/stockEntry";

type Options = Readonly<{ page: Page; query: string }>;

/** The authored catalog order for a query across motion metadata. */
function _getCatalogNamesFromQuery(query: string): string[] {
  return STOCK_CATALOG.filter((preset) => {
    return [
      preset.name,
      preset.id,
      preset.description,
      preset.useWhen,
      preset.searchText,
      ...preset.tags,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase().trim());
  }).map((preset) => {
    return preset.name;
  });
}

async function _getFilteredSnapshot({ page, query }: Options) {
  try {
    await page.getByRole("searchbox", { name: "Search motions" }).fill(query);
    return await page
      .getByRole("button", { name: /^Explore / })
      .evaluateAll((buttons) => {
        return {
          query:
            document.querySelector<HTMLInputElement>("#motion-search")?.value,
          names: buttons.map((button) => {
            return button.getAttribute("aria-label")?.replace(/^Explore /, "");
          }),
        };
      });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        "Execution context was destroyed, most likely because of a navigation",
      )
    ) {
      return undefined;
    }
    throw error;
  }
}

/** Captures the filtered catalog after any rebuild replaces the page. */
export async function getFilteredMotionNames({
  page,
  query,
}: Options): Promise<string[]> {
  const names = _getCatalogNamesFromQuery(query);
  await expect
    .poll(() => {
      return _getFilteredSnapshot({ page, query });
    })
    .toEqual({ query, names });
  return names;
}
