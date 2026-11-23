import { propEq } from "@avandar/utils";
import { useState } from "react";
import { HELPER_CATALOG } from "./HelperFilmIds";
import { HelperSelection } from "./HelperSelection/HelperSelection";
import type { HelperEntry } from "./helperCatalog.types";

/** The helper gallery's selection, its filtered helpers and its actions. */
type HelperGalleryState = {
  selection: HelperSelection;
  entries: HelperEntry[];
  open: HelperEntry | undefined;
  previous: HelperEntry | undefined;
  next: HelperEntry | undefined;
  openHelper: (helperId: string) => void;
  close: () => void;
  chooseCategory: (category: string) => void;
  setQuery: (query: string) => void;
};
/** Keeps the deep link in step with the open helper and category filter. */
function _replaceUrl(selection: HelperSelection): void {
  history.replaceState(
    null,
    "",
    HelperSelection.makeSearchFromSelection(selection),
  );
}
/** Helper filters, the open preview and its neighbours, deep linked. */
export function useHelperGallery(): HelperGalleryState {
  const [selection, setSelection] = useState(() => {
    return HelperSelection.getHelperSelectionFromSearch({
      search: location.search,
      catalog: HELPER_CATALOG,
    });
  });
  const entries = HelperSelection.filterHelpers({
    helpers: HELPER_CATALOG.helpers,
    options: selection,
  });
  const open =
    selection.helperId === undefined
      ? undefined
      : HELPER_CATALOG.helpers.find(propEq("id", selection.helperId));
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
    openHelper: (helperId: string) => {
      return update({ ...selection, helperId });
    },
    close: () => {
      return update({ ...selection, helperId: undefined });
    },
    chooseCategory: (category: string) => {
      return update({ ...selection, category });
    },
    setQuery: (query: string) => {
      return setSelection({ ...selection, query });
    },
  };
}
