import { propEq } from "@avandar/utils";
import { match } from "ts-pattern";
import { ALL_ATLAS_CATEGORIES } from "../../../gallery/AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { CONTINUITY_CATALOG } from "../../isSceneEntry";
import { makeCompositionSearchTextFromEntry } from "../../search/makeCompositionSearchTextFromEntry/makeCompositionSearchTextFromEntry";
import type {
  ContinuityCatalogEntry,
  ContinuityFamily,
} from "../../isSceneEntry";
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
function _gallerySelectionReducer(
  state: GallerySelection,
  action: GallerySelectionAction,
): GallerySelection {
  return match(action)
    .with({ type: "open" }, (matchedAction) => {
      const entry = CONTINUITY_CATALOG.find(propEq("id", matchedAction.id));
      if (
        !entry ||
        entry.family !== state.family ||
        entry.id === state.openId
      ) {
        return state;
      }
      return { ...state, openId: entry.id, captions: undefined };
    })
    .with({ type: "close" }, (matchedAction) => {
      return { ...state, openId: undefined, captions: undefined };
    })
    .with({ type: "category" }, (matchedAction) => {
      return { ...state, category: matchedAction.category };
    })
    .with({ type: "query" }, (matchedAction) => {
      return { ...state, query: matchedAction.query };
    })
    .with({ type: "captions" }, (matchedAction) => {
      return matchedAction.id === state.openId
        ? { ...state, captions: matchedAction.captions }
        : state;
    })
    .exhaustive();
}

/** Everything an entry can be searched by, lowercased. */
function _buildSearchText(entry: ContinuityCatalogEntry): string {
  return (
    entry.family === "vocabulary"
      ? `${entry.category} ${makeCompositionSearchTextFromEntry(entry)}`
      : `${entry.title} ${entry.description} ${entry.category}`
  ).toLowerCase();
}

/**
 * The section's entries in the chosen category whose copy contains the
 * search, case-insensitively, in catalog order.
 */
function _filterCompositionEntries(
  selection: Pick<GallerySelection, "family" | "category" | "query">,
): ContinuityCatalogEntry[] {
  const query = selection.query.trim().toLowerCase();
  return CONTINUITY_CATALOG.filter((entry) => {
    return (
      entry.family === selection.family &&
      (selection.category === ALL_ATLAS_CATEGORIES ||
        entry.category === selection.category) &&
      (!query || _buildSearchText(entry).includes(query))
    );
  });
}

/** Each of the family's categories, in catalog order, with its entry count. */
function _countCompositionCategories(
  family: ContinuityFamily,
): Array<{ id: string; count: number }> {
  const counts = new Map<string, number>();
  CONTINUITY_CATALOG.forEach((entry) => {
    if (entry.family === family) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
  });
  return Array.from(counts, ([id, count]) => {
    return { id, count };
  });
}

/** Filters and updates composition selection for the continuity gallery. */
export const CompositionSelection = {
  /**
   * Opens previews only within the section and ignores stale player options.
   */
  gallerySelectionReducer: _gallerySelectionReducer,
  /**
   * The section's entries in the chosen category whose copy contains the
   * search, case-insensitively, in catalog order.
   */
  filterCompositionEntries: _filterCompositionEntries,
  /**
   * Each of the family's categories, in catalog order, with its entry count.
   */
  countCompositionCategories: _countCompositionCategories,
};
