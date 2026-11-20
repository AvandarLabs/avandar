import { DUR, STAGGER, STAGGER_COLUMN, enter } from "../../../motion";
import { getColumnWipeProgress } from "../../../storyboard/StoryFilm/steppedColumnWipe";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { getElapsed, START } from "./getElapsed";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { Ruler } from "./parts/Ruler";
import { TimelineTrack } from "./parts/TimelineTrack";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

const SIBLINGS = ["first", "second", "third", "fourth", "fifth", "sixth"];

/** Six siblings starting `STAGGER` frames apart, each lasting a panel. */
export function StaggerDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const elapsed = getElapsed(frame);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`enter(frame, ${START} + index * STAGGER)  STAGGER = ${STAGGER}`}
      readouts={[{ name: "elapsed", value: `${elapsed}f` }]}
    >
      <div className={css.timeline}>
        {SIBLINGS.map((name, index) => {
          return (
            <div key={name} className={css.timelineRow}>
              <span
                className={css.timelineName}
                style={enter(frame, START + index * STAGGER)}
              >
                {`index ${index} @ ${index * STAGGER}f`}
              </span>
              <TimelineTrack
                startFrame={index * STAGGER}
                frames={DUR.panel}
                elapsed={elapsed}
              />
            </div>
          );
        })}
        <Ruler />
      </div>
    </HelperDemoFrame>
  );
}

const COLUMNS = 8;
/** Frames the whole stepped wipe takes in this preview. */
const WIPE_FRAMES = 12;

/** Eight columns rising `STAGGER_COLUMN` frames apart, at sub-frame offsets. */
export function StaggerColumnDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const progress = getColumnWipeProgress(
    Math.max(0, frame - START),
    WIPE_FRAMES,
    {
      columns: COLUMNS,
      staggerFrames: STAGGER_COLUMN,
    },
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getColumnWipeProgress(frame, ${WIPE_FRAMES}, { columns: ${COLUMNS}, staggerFrames: STAGGER_COLUMN })`}
      readouts={[
        { name: "STAGGER_COLUMN", value: String(STAGGER_COLUMN) },
        { name: "first", value: formatReadout(progress[0]) },
        { name: "last", value: formatReadout(progress[COLUMNS - 1]) },
      ]}
    >
      <div className={css.columns}>
        {progress.map((columnProgress, index) => {
          return (
            <div
              key={`column-${index * STAGGER_COLUMN}`}
              className={css.columnCell}
            >
              <div className={css.columnTrack}>
                <span
                  className={css.columnFill}
                  style={{ height: `${(columnProgress * 100).toFixed(2)}%` }}
                />
              </div>
              <span
                className={css.caption}
              >{`${index * STAGGER_COLUMN}f`}</span>
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
