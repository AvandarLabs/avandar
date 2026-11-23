import { BarComparisonMotion } from "../../../../../scenes/BarComparisonScene/BarComparisonMotion/BarComparisonMotion";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { ErasedRow } from "../ErasedRow/ErasedRow";
import { MaskDemosGalleryValues } from "../MaskDemosGalleryValues/MaskDemosGalleryValues";
import css from "./EraseScheduleDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

/** Two panels of four elements, as BarComparisonScene erases them. */
const SCHEDULE = BarComparisonMotion.getEraseStartFrames({
  atFrame: MaskDemosGalleryValues.ERASE_AT,
  elementCounts: [4, 4],
  staggerFrames: 1.5,
  panelStaggerFrames: 6,
});

/** Two panels erasing in reading order, panel by panel. */
export function EraseScheduleDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getEraseStartFrames({ atFrame: 40, elementCounts: [4, 4], staggerFrames: 1.5, panelStaggerFrames: 6 })"
      readouts={SCHEDULE.map((starts, panel) => {
        return {
          name: `panel ${panel}`,
          value: starts
            .map((start) => {
              return `${start}f`;
            })
            .join(" "),
        };
      })}
    >
      <div className={css.eraseScheduleDemoCards}>
        {SCHEDULE.map((starts, panel) => {
          return (
            <div
              key={`panel-${starts[0]}`}
              className={css.eraseScheduleDemoList}
            >
              {starts.map((start, index) => {
                return (
                  <ErasedRow
                    key={start}
                    frame={frame}
                    index={index + panel}
                    eraseAt={start}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
