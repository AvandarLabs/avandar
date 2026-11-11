import { Fragment } from "react";
import { useContinuityCopy } from "../../useContinuityCopy";
import { CompositionEntry } from "./CompositionEntry/CompositionEntry";
import css from "./CompositionSidebar.module.css";
import { useCategoryLabel } from "./useCategoryLabel/useCategoryLabel";
import type {
  ContinuityCatalogEntry,
  ContinuityFamily,
} from "../../continuityCatalog";
import type { GallerySelection } from "../gallerySelectionReducer/gallerySelectionReducer";

type Props = {
  entries: readonly ContinuityCatalogEntry[];
  selection: GallerySelection;
  onFamilyChange: (family: ContinuityFamily) => void;
  onSelect: (id: string) => void;
  onQueryChange: (query: string) => void;
};

/** Searchable collection navigation that keeps its selected family explicit. */
export function CompositionSidebar({
  entries,
  selection,
  onSelect,
  onQueryChange,
}: Props) {
  const translate = useContinuityCopy();
  const getCategoryLabel = useCategoryLabel();
  return (
    <aside
      className={css.compositionSidebar}
      aria-label={translate("Choose a composition")}
    >
      <input
        className={css.compositionSidebarSearch}
        aria-label={translate("Search compositions")}
        placeholder={translate("Search the collection")}
        value={selection.query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {entries.map((entry, index) => (
        <Fragment key={entry.id}>
          {entry.category !== entries[index - 1]?.category && (
            <h2 className={css.compositionSidebarGroup}>
              {getCategoryLabel(entry.category)}
            </h2>
          )}
          <CompositionEntry
            entry={entry}
            isSelected={entry.id === selection.selectedId}
            onSelect={onSelect}
          />
        </Fragment>
      ))}
      {!entries.length && (
        <p>{translate("No matching compositions. Try another search.")}</p>
      )}
    </aside>
  );
}
