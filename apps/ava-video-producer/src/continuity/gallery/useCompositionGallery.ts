import { useCallback, useReducer } from "react";
import { CONTINUITY_CATALOG } from "../continuityCatalog";
import { buildCompositionSearchTextFromEntry } from "../search/buildCompositionSearchTextFromEntry/buildCompositionSearchTextFromEntry";
import { gallerySelectionReducer } from "./gallerySelectionReducer/gallerySelectionReducer";
import type { ContinuityFamily } from "../continuityCatalog";
import type { GallerySelection } from "./gallerySelectionReducer/gallerySelectionReducer";

function _createInitialSelection(): GallerySelection {
  const requested = new URLSearchParams(location.search).get("film");
  const entry =
    CONTINUITY_CATALOG.find((candidate) => candidate.id === requested) ??
    CONTINUITY_CATALOG.find(
      (candidate) =>
        candidate.family ===
        (new URLSearchParams(location.search).get("section") === "compositions"
          ? "vocabulary"
          : "films"),
    )!;
  return {
    selectedId: entry.id,
    family: entry.family,
    query: "",
    captions: undefined,
  };
}

/** Gallery selection and filters, with caption state scoped to the active iframe. */
export function useCompositionGallery() {
  const [selection, dispatch] = useReducer(
    gallerySelectionReducer,
    undefined,
    _createInitialSelection,
  );
  const selected = CONTINUITY_CATALOG.find(
    (entry) => entry.id === selection.selectedId,
  )!;
  const entries = CONTINUITY_CATALOG.filter(
    (entry) =>
      entry.family === selection.family &&
      (entry.family === "vocabulary"
        ? `${entry.category} ${buildCompositionSearchTextFromEntry(entry)}`
        : `${entry.title} ${entry.description} ${entry.category}`
      )
        .toLowerCase()
        .includes(selection.query.toLowerCase()),
  );
  const select = (id: string) => {
    dispatch({ type: "select", id });
    history.replaceState(
      null,
      "",
      `?section=${selected.family === "films" ? "films" : "compositions"}&film=${encodeURIComponent(id)}`,
    );
  };
  const chooseFamily = (family: ContinuityFamily) => {
    dispatch({ type: "family", family });
    const entry = CONTINUITY_CATALOG.find(
      (candidate) => candidate.family === family,
    );
    if (family !== selection.family && entry) {
      history.replaceState(null, "", `?film=${encodeURIComponent(entry.id)}`);
    }
  };
  const receiveOptions = useCallback(
    (options: { id: string; captions: boolean }) => {
      dispatch({ type: "captions", ...options });
    },
    [dispatch],
  );
  return {
    selection,
    selected,
    entries,
    select,
    chooseFamily,
    receiveOptions,
    setQuery: (query: string) => dispatch({ type: "query", query }),
  };
}
