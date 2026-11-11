import type { HelperCatalog, HelperEntry } from "../helperCatalog.types";

/** The category filter value that shows every helper. */
export const ALL_CATEGORIES = "all";

/** Which helper is open, and how the list is filtered. */
export type HelperSelection = {
  helperId: string;
  /** A category id, or `ALL_CATEGORIES`. */
  category: string;
  query: string;
};

/**
 * The selection a deep link names, for example
 * `?section=helpers&helper=erase-mask&category=masks`. Unknown ids fall back
 * to the first helper and every category.
 */
export function getHelperSelectionFromSearch(
  search: string,
  catalog: HelperCatalog,
): HelperSelection {
  const parameters = new URLSearchParams(search);
  const requestedHelper = parameters.get("helper");
  const requestedCategory = parameters.get("category");
  const helper =
    catalog.helpers.find((entry) => entry.id === requestedHelper) ??
    catalog.helpers[0];
  const category = catalog.categories.some(
    (entry) => entry.id === requestedCategory,
  )
    ? requestedCategory!
    : ALL_CATEGORIES;
  return { helperId: helper.id, category, query: "" };
}

/** The query string that deep links to a helper and its category filter. */
export function buildHelperSearch(
  selection: Pick<HelperSelection, "helperId" | "category">,
): string {
  const parameters = new URLSearchParams({
    section: "helpers",
    helper: selection.helperId,
  });
  if (selection.category !== ALL_CATEGORIES) {
    parameters.set("category", selection.category);
  }
  return `?${parameters.toString()}`;
}

/** Everything a reader might search a helper by, in the language they see. */
function _buildSearchText(
  helper: HelperEntry,
  translate: (message: string) => string,
): string {
  return [
    helper.id,
    translate(helper.title),
    translate(helper.description),
    translate(helper.goodFor),
    translate(helper.avoid),
    ...helper.exports,
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * The helpers in `category` whose copy or exported names contain `query`,
 * case-insensitively, in catalog order.
 */
export function filterHelpers(
  helpers: readonly HelperEntry[],
  options: {
    category: string;
    query: string;
    translate: (message: string) => string;
  },
): HelperEntry[] {
  const query = options.query.trim().toLowerCase();
  return helpers.filter(
    (helper) =>
      (options.category === ALL_CATEGORIES ||
        helper.category === options.category) &&
      (!query || _buildSearchText(helper, options.translate).includes(query)),
  );
}
