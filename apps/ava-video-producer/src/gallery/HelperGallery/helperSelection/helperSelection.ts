import { ALL_ATLAS_CATEGORIES } from "../../AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import type { HelperCatalog, HelperEntry } from "../helperCatalog.types";

/** Which helper's preview is open, and how the gallery is filtered. */
export type HelperSelection = {
  /** The helper whose preview modal is open, if any. */
  helperId: string | undefined;
  /** A category id, or `ALL_ATLAS_CATEGORIES`. */
  category: string;
  query: string;
};

/**
 * The selection a deep link names, for example
 * `?section=helpers&helper=erase-mask&category=masks`. Unknown ids open no
 * preview and show every category.
 */
export function getHelperSelectionFromSearch(
  search: string,
  catalog: HelperCatalog,
): HelperSelection {
  const parameters = new URLSearchParams(search);
  const requestedHelper = parameters.get("helper");
  const requestedCategory = parameters.get("category");
  const helper = catalog.helpers.find((entry) => entry.id === requestedHelper);
  const category = catalog.categories.some(
    (entry) => entry.id === requestedCategory,
  )
    ? requestedCategory!
    : ALL_ATLAS_CATEGORIES;
  return { helperId: helper?.id, category, query: "" };
}

/** The query string that deep links to an open helper and category filter. */
export function buildHelperSearch(
  selection: Pick<HelperSelection, "helperId" | "category">,
): string {
  const parameters = new URLSearchParams({ section: "helpers" });
  if (selection.helperId) {
    parameters.set("helper", selection.helperId);
  }
  if (selection.category !== ALL_ATLAS_CATEGORIES) {
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
      (options.category === ALL_ATLAS_CATEGORIES ||
        helper.category === options.category) &&
      (!query || _buildSearchText(helper, options.translate).includes(query)),
  );
}
