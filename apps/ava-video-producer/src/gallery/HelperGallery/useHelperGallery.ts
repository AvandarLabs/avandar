import { useState } from "react";
import { HELPER_CATALOG } from "./helperCatalog";
import {
  buildHelperSearch,
  filterHelpers,
  getHelperSelectionFromSearch,
} from "./helperSelection/helperSelection";
import type { HelperSelection } from "./helperSelection/helperSelection";

/** Keeps the deep link in step with the open helper and category filter. */
function _replaceUrl(selection: HelperSelection): void {
  history.replaceState(null, "", buildHelperSearch(selection));
}

/** Helper filters, the open preview and its neighbours, deep linked. */
export function useHelperGallery() {
  const [selection, setSelection] = useState(() =>
    getHelperSelectionFromSearch(location.search, HELPER_CATALOG),
  );
  const entries = filterHelpers(HELPER_CATALOG.helpers, selection);
  const open = HELPER_CATALOG.helpers.find(
    (helper) => helper.id === selection.helperId,
  );
  // Browsing a deep-linked helper outside the current filter still works.
  const browsable = open && !entries.includes(open) ? [open] : entries;
  const index = open ? browsable.indexOf(open) : -1;
  const update = (nextSelection: HelperSelection) => {
    setSelection(nextSelection);
    _replaceUrl(nextSelection);
  };
  return {
    selection,
    entries,
    open,
    previous: index > 0 ? browsable[index - 1] : undefined,
    next: index >= 0 ? browsable[index + 1] : undefined,
    openHelper: (helperId: string) => update({ ...selection, helperId }),
    close: () => update({ ...selection, helperId: undefined }),
    chooseCategory: (category: string) => update({ ...selection, category }),
    setQuery: (query: string) => setSelection({ ...selection, query }),
  };
}
