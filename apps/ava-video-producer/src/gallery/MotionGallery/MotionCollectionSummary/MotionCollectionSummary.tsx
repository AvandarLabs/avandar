import css from "./MotionCollectionSummary.module.css";
import type { MotionGalleryState } from "../useMotionGalleryState/useMotionGalleryState.types";
import type { ReactNode } from "react";

type Props = Pick<MotionGalleryState, "category">;
/** Shows the browsing guidance and playback cadence in MotionLibrary. */
export function MotionCollectionSummary({
  category,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.motionCollectionSummaryCollectionSubline}>
      <span>
        {category === "Saved references"
          ? "Your references, ready for a creative brief."
          : "Explore a preset. Scrub the motion. Make it yours."}
      </span>
      <span className={css.motionCollectionSummaryLoopSpec}>
        6 SEC LOOPS
        <span>·</span>
        30 FPS
        <span>·</span>
        LIVE PREVIEWS
      </span>
    </div>
  );
}
