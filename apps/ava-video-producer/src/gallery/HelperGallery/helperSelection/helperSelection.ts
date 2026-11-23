import { propEq } from "@avandar/utils";
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
function _getHelperSelectionFromSearch({
  search,
  catalog,
}: Readonly<{
  search: string;
  catalog: HelperCatalog;
}>): HelperSelection {
  const parameters = new URLSearchParams(search);
  const requestedHelper = parameters.get("helper");
  const requestedCategory = parameters.get("category");
  const helper =
    requestedHelper === null
      ? undefined
      : catalog.helpers.find(propEq("id", requestedHelper));
  const category =
    requestedCategory !== null &&
    catalog.categories.some(propEq("id", requestedCategory))
      ? requestedCategory!
      : ALL_ATLAS_CATEGORIES;
  return { helperId: helper?.id, category, query: "" };
}
/** The query string that deep links to an open helper and category filter. */
function _makeSearchFromSelection(
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
/** Everything a reader might search a helper by. */
function _buildSearchText(helper: HelperEntry): string {
  return [
    helper.id,
    helper.title,
    helper.description,
    helper.goodFor,
    helper.avoid,
    ...helper.exports,
  ].join(" ");
}
/**
 * The helpers in `category` whose copy or exported names contain `query`,
 * case-insensitively, in catalog order.
 */
function _filterHelpers({
  helpers,
  options,
}: Readonly<{
  helpers: readonly HelperEntry[];
  options: {
    category: string;
    query: string;
  };
}>): HelperEntry[] {
  const query = options.query.trim().toLowerCase();
  return helpers.filter((helper) => {
    return (
      (options.category === ALL_ATLAS_CATEGORIES ||
        helper.category === options.category) &&
      (!query || _buildSearchText(helper).toLowerCase().includes(query))
    );
  });
}

/** Reads and filters HelperGallery selection from URL search parameters. */
export const HelperSelection = {
  /**
   * The selection a deep link names, for example
   * `?section=helpers&helper=erase-mask&category=masks`.
   */
  getHelperSelectionFromSearch: _getHelperSelectionFromSearch,
  /** The query string that deep links to an open helper and category filter. */
  makeSearchFromSelection: _makeSearchFromSelection,
  /**
   * The helpers in `category` whose copy or exported names contain `query`,
   * case-insensitively, in catalog order.
   */
  filterHelpers: _filterHelpers,
};
