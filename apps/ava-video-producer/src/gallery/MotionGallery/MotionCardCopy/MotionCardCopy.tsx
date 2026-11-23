import { clsx } from "clsx";
import { MotionCardHeading } from "../MotionCardHeading/MotionCardHeading";
import { MotionCardReference } from "../MotionCardReference/MotionCardReference";
import css from "./MotionCardCopy.module.css";
import type { StockPresetId } from "../../../stock/stockEntry";
import type { Preset } from "../Preset.types";
import type { ReactNode } from "react";

type Props = {
  preset: Preset;
  index: number;
  playing: boolean;
  visible: boolean;
  saved: boolean;
  onOpen: (preset: Preset) => void;
  onSave: (id: StockPresetId) => void;
};
/** Presents MotionCard metadata and reference actions below its preview. */
export function MotionCardCopy({
  preset,
  index,
  playing,
  visible,
  saved,
  onOpen,
  onSave,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.motionCardCopyCardCopy}>
      <div className={css.motionCardCopyCardCategory}>
        <span>{preset.category}</span>
        <span
          className={clsx(
            css.motionCardCopyCardState,
            playing && visible ? "is-playing" : "",
          )}
        >
          <i />
          {playing && visible ? "LIVE" : "PAUSED"}
        </span>
      </div>
      <MotionCardHeading {...{ preset, saved, onOpen, onSave }} />
      <p>{preset.description}</p>
      <MotionCardReference {...{ preset, index, onOpen }} />
    </div>
  );
}
