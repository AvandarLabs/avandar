import { getEraseMaskStyle } from "../../../../motion-components/eraseMask";
import {
  getEraseStartFrames,
  getRoughEdgeClipPath,
} from "../../../../scenes/BarComparisonScene/barComparisonMotion/barComparisonMotion";
import { useWindowStage } from "../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { WINDOW_BOX } from "../../../../scenes/TiltedWindowScene/windowTilt";
import { getColumnWipeProgress } from "../../../../storyboard/StoryFilm/steppedColumnWipe/steppedColumnWipe";
import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import css from "../demos.module.css";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas } from "../parts/DemoCanvas";
import { getCanvasRect } from "../parts/getCanvasRect";
import { TiltedDemoWindow } from "../parts/TiltedDemoWindow";
import { MaskDemosShared } from "./MaskDemosShared/MaskDemosShared";
import { SteppedWipeStage } from "./SteppedWipeStage";
import type { HelperDemoProps } from "../helperDemo.types";
import type { DemoReadout } from "../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

const ROWS = ["first", "second", "third", "fourth"];
const ERASE_AT = 40;
/** Frames each row's erase takes, longer than the scene's so it reads. */
const ERASE_FRAMES = 10;
/** When the rows start arriving. A cue, not a length. */
const ROWS_AT = 6;
/** One list row erased behind the soft-edged mask, on the travel curve. */
function ErasedRow(props: { frame: number; index: number; eraseAt: number }) {
  const motion = useVideoMotion();
  const progress = motion.ramp(
    props.frame,
    props.eraseAt,
    motion.scale(ERASE_FRAMES),
    motion.travel.easing,
  );
  return (
    <div
      className={css.listRow}
      style={{
        ...motion.enterAt(props.frame, ROWS_AT, props.index),
        ...getEraseMaskStyle(progress),
      }}
    >
      <span className={css.listDot} />
      <span className={css.listBar} style={{ width: 140 + props.index * 40 }} />
    </div>
  );
}
/** Rows erased left to right behind a soft edge, one after another. */
export function EraseMaskDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const progress = motion.ramp(
    frame,
    ERASE_AT,
    motion.scale(ERASE_FRAMES),
    motion.travel.easing,
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getEraseMaskStyle(motion.ramp(frame, ${ERASE_AT} + index * 3, ${ERASE_FRAMES}, travel))`}
      readouts={[
        {
          name: "progress",
          value: DemoTheme.formatReadout({ value: progress }),
        },
        { name: "feather", value: "0.1" },
      ]}
    >
      <div className={css.list}>
        {ROWS.map((row, index) => {
          return (
            <ErasedRow
              key={row}
              frame={frame}
              index={index}
              eraseAt={ERASE_AT + index * 3}
            />
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
/** Two panels of four elements, as BarComparisonScene erases them. */
const SCHEDULE = getEraseStartFrames({
  atFrame: ERASE_AT,
  elementCounts: [4, 4],
  staggerFrames: 1.5,
  panelStaggerFrames: 6,
});
/** Two panels erasing in reading order, panel by panel. */
export function EraseScheduleDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
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
      <div className={css.cards}>
        {SCHEDULE.map((starts, panel) => {
          return (
            <div key={`panel-${starts[0]}`} className={css.list}>
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
/** The stepped column wipe revealing shot B over shot A. */
export function SteppedColumnWipeDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const local = Math.max(0, frame - MaskDemosShared.WIPE_AT);
  const progress = getColumnWipeProgress({
    frame: local,
    durationInFrames: MaskDemosShared.WIPE_FRAMES,
    options: MaskDemosShared.WIPES[0].options,
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getSteppedColumnWipeStyle({ frame: frame - ${MaskDemosShared.WIPE_AT}, durationInFrames: ${MaskDemosShared.WIPE_FRAMES}, options })`}
      readouts={_getColumnWipeReadouts(progress)}
    >
      <div className={`${css.miniStages} ${css.twoUp}`}>
        {MaskDemosShared.WIPES.map((wipe) => {
          return (
            <SteppedWipeStage
              key={wipe.code}
              wipe={wipe}
              frame={frame}
              local={local}
            />
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
const REVEAL = { durationInFrames: 14 };
/** A window rising into the tilted plane through four columns. */
export function WindowRevealDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const stage = useWindowStage();
  const style = WindowMotion.getWindowRevealStyle({
    frame,
    at: 10,
    reveal: REVEAL,
    stage,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        "WindowMotion.getWindowRevealStyle({ frame, at: 10, reveal: { durationInFrames: 14 } })"
      }
      readouts={[
        { name: "clipPath", value: style.clipPath ? "staircase" : "none" },
      ]}
    >
      <DemoCanvas>
        {frame >= 10 ? (
          <TiltedDemoWindow
            box={getCanvasRect(WINDOW_BOX)}
            pose={WindowMotion.getRestingPose(stage)}
            contentStyle={style}
          />
        ) : null}
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
const BAR_VALUES = [0.92, 0.7, 0.55, 0.38];
const EDGE_DEPTH = 10;
/** When the bars start growing. A cue, not a length. */
const BARS_AT = 10;
/** Bars growing with a seeded, brush-like right edge. */
export function RoughEdgeDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getRoughEdgeClipPath(rowIndex, ${EDGE_DEPTH})`}
      readouts={[
        { name: "depth", value: `${EDGE_DEPTH}px` },
        { name: "seed", value: "row index" },
      ]}
    >
      <div className={css.timeline}>
        {BAR_VALUES.map((value, index) => {
          return (
            <div key={value} className={css.row}>
              <div
                className={css.bar}
                style={{
                  width:
                    motion.ramp(
                      frame,
                      BARS_AT + index * motion.stagger.list,
                      motion.sheet,
                      motion.rise.easing,
                    ) *
                    value *
                    760,
                  clipPath: getRoughEdgeClipPath(index, EDGE_DEPTH),
                }}
              />
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}

/** Formats the live readouts displayed by SteppedColumnWipeDemo. */
function _getColumnWipeReadouts(progress: readonly number[]): DemoReadout[] {
  return [
    {
      name: "column 0",
      value: DemoTheme.formatReadout({ value: progress[0] }),
    },
    {
      name: "column 7",
      value: DemoTheme.formatReadout({ value: progress[7] }),
    },
  ];
}
