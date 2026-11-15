import clsx from "clsx";
import css from "./CompositionStage.module.css";
import type { ContinuityCatalogEntry } from "../../../continuityCatalog";
import type { RefObject } from "react";

type Props = Readonly<{
  selected: ContinuityCatalogEntry;
  player: RefObject<HTMLIFrameElement | null>;
  /** Whether the Design tokens tab is open, which pins the stage as a strip on a phone. */
  isTokenPanel: boolean;
  onLoad: () => void;
}>;

/** The live player, remounted for each composition. */
export function CompositionStage({
  selected,
  player,
  isTokenPanel,
  onLoad,
}: Props) {
  return (
    <div
      className={clsx(
        css.compositionStage,
        isTokenPanel && css.compositionStageIsTokenPanel,
      )}
    >
      <iframe
        key={selected.id}
        className={css.compositionStagePlayer}
        ref={player}
        src={`/live.html?id=${encodeURIComponent(selected.id)}`}
        title={selected.title}
        onLoad={onLoad}
        allowFullScreen
      />
    </div>
  );
}
