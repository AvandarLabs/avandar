import { clsx } from "clsx";
import css from "./CompositionStage.module.css";
import type { ContinuityCatalogEntry } from "../../../continuityCatalog";
import type { ReactNode, RefObject } from "react";

type Props = Readonly<{
  selected: ContinuityCatalogEntry;
  player: RefObject<HTMLIFrameElement | null>;
  /**
   * Whether the Design tokens tab is open, which pins the stage as a strip on a
   * phone.
   */
  isTokenPanel: boolean;
  onLoad: () => void;
}>;

/** The live player, remounted for each composition. */
export function CompositionStage({
  selected,
  player,
  isTokenPanel,
  onLoad,
}: Props): ReactNode {
  return (
    <div
      className={clsx(
        css.compositionStage,
        isTokenPanel && css.compositionStageIsTokenPanel,
      )}
    >
      {/* Do not add `sandbox` without `allow-same-origin`: `/live.html` is a
          first-party player that reads `sessionStorage`, loads product stores,
          and verifies `event.origin === location.origin` on `postMessage`. */}
      {/* react-doctor-disable-next-line react-doctor/iframe-missing-sandbox */}
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
