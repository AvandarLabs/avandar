import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { ErasedRow } from "../ErasedRow/ErasedRow";
import { MaskDemosGalleryValues } from "../MaskDemosGalleryValues/MaskDemosGalleryValues";
import css from "./EraseMaskDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const ROWS = ["first", "second", "third", "fourth"];

/** Rows erased left to right behind a soft edge, one after another. */
export function EraseMaskDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const progress = motion.ramp(
    frame,
    MaskDemosGalleryValues.ERASE_AT,
    motion.scale(MaskDemosGalleryValues.ERASE_FRAMES),
    motion.travel.easing,
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getEraseMaskStyle({ progress: motion.ramp(frame, ${MaskDemosGalleryValues.ERASE_AT} + index * 3, motion.scale(${MaskDemosGalleryValues.ERASE_FRAMES}), motion.travel.easing) })`}
      readouts={[
        {
          name: "progress",
          value: DemoTheme.formatReadout({ value: progress }),
        },
        { name: "feather", value: "0.1" },
      ]}
    >
      <div className={css.eraseMaskDemoList}>
        {ROWS.map((row, index) => {
          return (
            <ErasedRow
              key={row}
              frame={frame}
              index={index}
              eraseAt={MaskDemosGalleryValues.ERASE_AT + index * 3}
            />
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
