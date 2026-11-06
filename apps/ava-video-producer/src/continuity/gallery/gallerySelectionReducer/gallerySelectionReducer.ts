import { CONTINUITY_CATALOG } from "../../continuityCatalog";
import type { ContinuityFamily } from "../../continuityCatalog";

/** Current screening and the caption options acknowledged by its live player. */
export type GallerySelection = {
  selectedId: string;
  family: ContinuityFamily;
  query: string;
  captions: boolean | undefined;
};

/** User selection, filtering and scoped live-player option events. */
export type GallerySelectionAction =
  | { type: "select"; id: string }
  | { type: "family"; family: ContinuityFamily }
  | { type: "query"; query: string }
  | { type: "captions"; id: string; captions: boolean };

function _selectEntry(state: GallerySelection, id: string): GallerySelection {
  const entry = CONTINUITY_CATALOG.find((candidate) => candidate.id === id);
  if (!entry || entry.id === state.selectedId) {
    return state;
  }
  return {
    selectedId: entry.id,
    family: entry.family,
    query: entry.family === state.family ? state.query : "",
    captions: undefined,
  };
}

/** Keeps the active preview in its selected family and ignores stale options. */
export function gallerySelectionReducer(
  state: GallerySelection,
  action: GallerySelectionAction,
): GallerySelection {
  switch (action.type) {
    case "select":
      return _selectEntry(state, action.id);
    case "family": {
      const entry = CONTINUITY_CATALOG.find(
        (candidate) => candidate.family === action.family,
      );
      return action.family === state.family || !entry
        ? state
        : { ..._selectEntry(state, entry.id), query: "" };
    }
    case "query":
      return { ...state, query: action.query };
    case "captions":
      return action.id === state.selectedId
        ? { ...state, captions: action.captions }
        : state;
  }
}
