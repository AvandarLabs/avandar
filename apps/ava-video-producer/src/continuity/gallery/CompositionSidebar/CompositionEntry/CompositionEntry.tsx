import { useContinuityCopy } from "../../../useContinuityCopy";
import css from "./CompositionEntry.module.css";
import type { ContinuityCatalogEntry } from "../../../continuityCatalog";

type Props = {
  entry: ContinuityCatalogEntry;
  isSelected: boolean;
  onSelect: (id: string) => void;
};
const CATEGORY_LABELS: Record<string, string> = {
  "motion-motion": "Motion to motion",
  "motion-product": "Motion to product",
  "product-motion": "Product to motion",
  composite: "Product and motion",
  transitions: "Transitions",
  compositing: "Compositing",
  compositions: "Composition recipes",
};

/** A selectable collection item with its category and authored duration. */
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
        {translate(CATEGORY_LABELS[entry.category] ?? entry.category)} ·{" "}
        {Math.round(entry.frames / 30)} {translate("seconds")}
      </small>
    </button>
  );
}
