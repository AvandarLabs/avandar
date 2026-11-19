import { useCallback, useReducer } from "react";
import { ALL_ATLAS_CATEGORIES } from "../../gallery/AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { CONTINUITY_CATALOG } from "../continuityCatalog";
import {
  countCompositionCategories,
  filterCompositionEntries,
  gallerySelectionReducer,
} from "./gallerySelectionReducer/gallerySelectionReducer";
import type {
  ContinuityCatalogEntry,
  ContinuityFamily,
} from "../continuityCatalog";
import type { GallerySelection } from "./gallerySelectionReducer/gallerySelectionReducer";

/** One family's selection, visible entries, open preview, and actions. */
type CompositionGalleryState = {
  selection: GallerySelection;
  entries: ContinuityCatalogEntry[];
  open: ContinuityCatalogEntry | undefined;
  previous: ContinuityCatalogEntry | undefined;
  next: ContinuityCatalogEntry | undefined;
  openEntry: (id: string) => void;
  close: () => void;
  chooseCategory: (category: string) => void;
  setQuery: (query: string) => void;
  receiveOptions: (options: { id: string; captions: boolean }) => void;
};

/** The Atlas section that browses a catalog family. */
function _toSection(family: ContinuityFamily): "films" | "compositions" {
  return family === "films" ? "films" : "compositions";
}

/**
 * The selection a deep link names, for example
 * `?section=compositions&category=transitions&film=whip-exit`. An entry from
 * this family opens its preview; unknown values fall back to every category
 * and no open preview.
 */
function _createInitialSelection(family: ContinuityFamily): GallerySelection {
  const parameters = new URLSearchParams(location.search);
  const entry = CONTINUITY_CATALOG.find((candidate) => {
    return (
      candidate.id === parameters.get("film") && candidate.family === family
    );
  });
  const category = parameters.get("category");
  const isKnownCategory = countCompositionCategories(family).some((item) => {
    return item.id === category;
  });
  return {
    family,
    category: isKnownCategory ? category! : ALL_ATLAS_CATEGORIES,
    query: "",
    openId: entry?.id,
    captions: undefined,
  };
}

/** Keeps the deep link in step with the open preview and category filter. */
function _replaceUrl(
  selection: Pick<GallerySelection, "family" | "category" | "openId">,
) {
  const parameters = new URLSearchParams({
    section: _toSection(selection.family),
  });
  if (selection.category !== ALL_ATLAS_CATEGORIES) {
    parameters.set("category", selection.category);
  }
  if (selection.openId) {
    parameters.set("film", selection.openId);
  }
  history.replaceState(null, "", `?${parameters.toString()}`);
}

/**
 * One family's gallery: category filter, search, the open preview and its
 * neighbours, with caption state scoped to the open live player.
 */
export function useCompositionGallery(
  family: ContinuityFamily,
): CompositionGalleryState {
  const [selection, dispatch] = useReducer(
    gallerySelectionReducer,
    family,
    _createInitialSelection,
  );
  const entries = filterCompositionEntries(selection);
  const open = CONTINUITY_CATALOG.find((entry) => {
    return entry.id === selection.openId;
  });
  // Browsing a deep-linked entry outside the current filter still works.
  const browsable = open && !entries.includes(open) ? [open] : entries;
  const index = open ? browsable.indexOf(open) : -1;
  const receiveOptions = useCallback(
    (options: { id: string; captions: boolean }) => {
      dispatch({ type: "captions", ...options });
    },
    [dispatch],
  );
  return {
    selection,
    entries,
    open,
    previous: index > 0 ? browsable[index - 1] : undefined,
    next: index >= 0 ? browsable[index + 1] : undefined,
    openEntry: (id: string) => {
      dispatch({ type: "open", id });
      _replaceUrl({ ...selection, openId: id });
    },
    close: () => {
      dispatch({ type: "close" });
      _replaceUrl({ ...selection, openId: undefined });
    },
    chooseCategory: (category: string) => {
      dispatch({ type: "category", category });
      _replaceUrl({ ...selection, category });
    },
    setQuery: (query: string) => {
      return dispatch({ type: "query", query });
    },
    receiveOptions,
  };
}
