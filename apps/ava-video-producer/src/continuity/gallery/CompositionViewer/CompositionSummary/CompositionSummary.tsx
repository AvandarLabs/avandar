import css from "./CompositionSummary.module.css";
import type { ContinuityCatalogEntry } from "../../../isSceneEntry";
import type { ReactNode } from "react";

type Props = { selected: ContinuityCatalogEntry };

/**
 * Authored purpose and duration for the current screening. The Atlas
 * preview modal around it already shows the title.
 */
export function CompositionSummary({ selected }: Props): ReactNode {
  return (
    <div className={css.compositionSummaryRoot}>
      <div>
        <p>{selected.description}</p>
      </div>
      <span className={css.compositionSummaryDuration}>
        {Math.round(selected.frames / 30)} {"seconds"}
      </span>
    </div>
  );
}
