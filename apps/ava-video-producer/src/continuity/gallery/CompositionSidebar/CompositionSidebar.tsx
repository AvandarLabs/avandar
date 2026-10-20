import { useContinuityCopy } from "../../useContinuityCopy";
import { CompositionEntry } from "./CompositionEntry/CompositionEntry";
import css from "./CompositionSidebar.module.css";
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
      {entries.map((entry) => (
        <CompositionEntry
          key={entry.id}
          entry={entry}
          isSelected={entry.id === selection.selectedId}
          onSelect={onSelect}
        />
      ))}
      {!entries.length && (
        <p>{translate("No matching compositions. Try another search.")}</p>
      )}
    </aside>
  );
}
