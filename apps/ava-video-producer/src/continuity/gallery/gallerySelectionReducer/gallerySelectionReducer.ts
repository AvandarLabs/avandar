import { ALL_ATLAS_CATEGORIES } from "../../../gallery/AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { CONTINUITY_CATALOG } from "../../continuityCatalog";
import { buildCompositionSearchTextFromEntry } from "../../search/buildCompositionSearchTextFromEntry/buildCompositionSearchTextFromEntry";
import type {
  ContinuityCatalogEntry,
  ContinuityFamily,
} from "../../continuityCatalog";

/**
 * One section's filters and its open preview. `family` is fixed by the
 * section: Compositions browse studies, Sample films browse films.
 */
export type GallerySelection = {
  family: ContinuityFamily;
  /** A catalog category id, or `ALL_ATLAS_CATEGORIES`. */
  category: string;
  query: string;
  /** The entry whose preview modal is open, if any. */
  openId: string | undefined;
  /** Caption choice acknowledged by the open entry's live player. */
  captions: boolean | undefined;
};

/** User filtering, preview, and scoped live-player option events. */
export type GallerySelectionAction =
  | { type: "open"; id: string }
  | { type: "close" }
  | { type: "category"; category: string }
  | { type: "query"; query: string }
  | { type: "captions"; id: string; captions: boolean };

/** Opens previews only within the section and ignores stale player options. */
export function gallerySelectionReducer(
  state: GallerySelection,
  action: GallerySelectionAction,
): GallerySelection {
  switch (action.type) {
    case "open": {
      const entry = CONTINUITY_CATALOG.find(
        (candidate) => candidate.id === action.id,
      );
      if (!entry || entry.family !== state.family || entry.id === state.openId)
        return state;
      return { ...state, openId: entry.id, captions: undefined };
    }
    case "close":
      return { ...state, openId: undefined, captions: undefined };
    case "category":
      return { ...state, category: action.category };
    case "query":
      return { ...state, query: action.query };
    case "captions":
      return action.id === state.openId
        ? { ...state, captions: action.captions }
        : state;
  }
}

/** Everything an entry can be searched by, lowercased. */
function _buildSearchText(entry: ContinuityCatalogEntry): string {
  return (
    entry.family === "vocabulary"
      ? `${entry.category} ${buildCompositionSearchTextFromEntry(entry)}`
      : `${entry.title} ${entry.description} ${entry.category}`
  ).toLowerCase();
}

/**
 * The section's entries in the chosen category whose copy contains the
 * search, case-insensitively, in catalog order.
 */
export function filterCompositionEntries(
  selection: Pick<GallerySelection, "family" | "category" | "query">,
): ContinuityCatalogEntry[] {
  const query = selection.query.trim().toLowerCase();
  return CONTINUITY_CATALOG.filter(
    (entry) =>
      entry.family === selection.family &&
      (selection.category === ALL_ATLAS_CATEGORIES ||
        entry.category === selection.category) &&
      (!query || _buildSearchText(entry).includes(query)),
  );
}

/** Each of the family's categories, in catalog order, with its entry count. */
export function countCompositionCategories(
  family: ContinuityFamily,
): Array<{ id: string; count: number }> {
  const counts = new Map<string, number>();
  CONTINUITY_CATALOG.forEach((entry) => {
    if (entry.family === family) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
  });
  return Array.from(counts, ([id, count]) => ({ id, count }));
}
