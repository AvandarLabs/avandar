import { useContinuityCopy } from "../../useContinuityCopy";
import css from "./CompositionViewer.module.css";
import type { ContinuityCatalogEntry } from "../../continuityCatalog";

type Props = { selected: ContinuityCatalogEntry };

/** Authored title, purpose and duration for the current screening. */
export function CompositionSummary({ selected }: Props) {
  const translate = useContinuityCopy();
  return (
    <div className={css.compositionViewerSummary}>
      <div>
        <h2>{translate(selected.title)}</h2>
        <p>{translate(selected.description)}</p>
      </div>
      <span className={css.compositionViewerDuration}>
        {Math.round(selected.frames / 30)} {translate("seconds")}
      </span>
    </div>
  );
}
