import { STOCK_CATALOG } from "../../../stock/stockEntry";
import { MotionCard } from "../MotionCard/MotionCard";
import css from "./MotionResultGrid.module.css";
import type { MotionGalleryState } from "../useMotionGalleryState/useMotionGalleryState.types";
import type { ReactNode } from "react";

const PRESET_INDEX = new Map(
  STOCK_CATALOG.map((preset, index) => {
    return [preset.id, index];
  }),
);
type Props = Pick<
  MotionGalleryState,
  "results" | "playing" | "selected" | "drafts" | "onOpen" | "onSave"
> & { savedIds: ReadonlySet<string> };
/** Renders the filtered motion cards with stable catalog positions. */
export function MotionResultGrid({
  results,
  playing,
  selected,
  drafts,
  savedIds,
  onOpen,
  onSave,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.motionResultGridMotionGrid}>
      {results.map((preset) => {
        return (
          <MotionCard
            key={preset.id}
            preset={preset}
            index={PRESET_INDEX.get(preset.id) ?? 0}
            playing={playing && !selected}
            contentState={drafts[preset.id]}
            saved={savedIds.has(preset.id)}
            onOpen={onOpen}
            onSave={onSave}
          />
        );
      })}
    </div>
  );
}
