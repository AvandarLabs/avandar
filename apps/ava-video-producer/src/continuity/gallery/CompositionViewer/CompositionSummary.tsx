import css from "./CompositionViewer.module.css";
import type { ContinuityCatalogEntry } from "../../continuityCatalog";
import type { ReactNode } from "react";

type Props = { selected: ContinuityCatalogEntry };

/**
 * Authored purpose and duration for the current screening. The Atlas
 * preview modal around it already shows the title.
 */
export function CompositionSummary({ selected }: Props): ReactNode {
  return (
    <div className={css.compositionViewerSummary}>
      <div>
        <p>{selected.description}</p>
      </div>
      <span className={css.compositionViewerDuration}>
        {Math.round(selected.frames / 30)} {"seconds"}
      </span>
    </div>
  );
}
