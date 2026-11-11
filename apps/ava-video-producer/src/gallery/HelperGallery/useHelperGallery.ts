import { useState } from "react";
import { HELPER_CATALOG } from "./helperCatalog";
import {
  buildHelperSearch,
  filterHelpers,
  getHelperSelectionFromSearch,
} from "./helperSelection/helperSelection";
import { useHelperCopy } from "./useHelperCopy";
import type { HelperSelection } from "./helperSelection/helperSelection";

/** Keeps the deep link in step with the open helper and category filter. */
function _replaceUrl(selection: HelperSelection): void {
  history.replaceState(null, "", buildHelperSearch(selection));
}

/** Helper selection, filters and neighbours, deep linked through the URL. */
export function useHelperGallery() {
  const translate = useHelperCopy();
  const [selection, setSelection] = useState(() =>
    getHelperSelectionFromSearch(location.search, HELPER_CATALOG),
  );
  const selected =
    HELPER_CATALOG.helpers.find((helper) => helper.id === selection.helperId) ??
    HELPER_CATALOG.helpers[0];
  const entries = filterHelpers(HELPER_CATALOG.helpers, {
    ...selection,
    translate,
  });
  const update = (next: HelperSelection) => {
    setSelection(next);
    _replaceUrl(next);
  };
  const index = entries.findIndex((helper) => helper.id === selected.id);
  return {
    selection,
    selected,
    entries,
    previous: index > 0 ? entries[index - 1] : undefined,
    next: index >= 0 ? entries[index + 1] : undefined,
    select: (helperId: string) => update({ ...selection, helperId }),
    chooseCategory: (category: string) => update({ ...selection, category }),
    setQuery: (query: string) => setSelection({ ...selection, query }),
  };
}
