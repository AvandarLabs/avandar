import { isSceneEntry } from "../../../continuityCatalog";
import { useContinuityCopy } from "../../../useContinuityCopy";
import css from "./CompositionEntry.module.css";
import type { ContinuityCatalogEntry } from "../../../continuityCatalog";

type Props = {
  entry: ContinuityCatalogEntry;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

/**
 * A selectable collection item with its kind and authored duration. Its
 * category is the sidebar group heading above it.
 */
export function CompositionEntry({ entry, isSelected, onSelect }: Props) {
  const translate = useContinuityCopy();
  return (
    <button
      className={css.compositionEntry}
      aria-current={isSelected}
      onClick={() => onSelect(entry.id)}
    >
      <strong>{translate(entry.title)}</strong>
      <small>
        {translate(isSceneEntry(entry) ? "Storyboard scenes" : "Continuity")} ·{" "}
        {Math.round(entry.frames / 30)} {translate("seconds")}
      </small>
    </button>
  );
}
