import { propEq } from "@avandar/utils";
import { HELPER_CATALOG } from "./HelperFilmIds";
/** Catalog categories used by helper navigation and card labels. */
export const HELPER_CATEGORIES = HELPER_CATALOG.categories.map((category) => {
  return {
    id: category.id,
    label: category.title,
    count: HELPER_CATALOG.helpers.filter(propEq("category", category.id))
      .length,
  };
});
/** Resolves a catalog category label for helper cards and previews. */
export function getHelperCategoryLabelFromId(id: string): string {
  return HELPER_CATEGORIES.find(propEq("id", id))?.label ?? id;
}
