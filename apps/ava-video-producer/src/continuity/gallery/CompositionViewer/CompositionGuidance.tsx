import { CompositionNotice } from "./CompositionNotice/CompositionNotice";
import css from "./CompositionViewer.module.css";
import { VocabularyGuide } from "./VocabularyGuide/VocabularyGuide";
import type { ContinuityCatalogEntry } from "../../isSceneEntry";
import type { ReactNode } from "react";

type Props = { selected: ContinuityCatalogEntry; isScene: boolean };
/** Shows the reusable study notes for the selected composition. */
export function CompositionGuidance({
  selected,
  isScene,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.compositionViewerGuidance}>
      {selected.family === "vocabulary" ? (
        <VocabularyGuide entry={selected} />
      ) : null}
      <CompositionNotice isScene={isScene} />
    </div>
  );
}
