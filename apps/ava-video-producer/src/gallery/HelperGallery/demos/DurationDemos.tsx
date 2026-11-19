import { getColumnWipeProgress } from "../../../storyboard/StoryFilm/steppedColumnWipe";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { getElapsed, START } from "./getElapsed";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { Ruler } from "./parts/Ruler";
import { TimelineTrack } from "./parts/TimelineTrack";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

const SIBLINGS = ["first", "second", "third", "fourth", "fifth", "sixth"];

/**
 * Six siblings starting the theme's list stagger apart (`STAGGER` in
 * `classic`), each lasting a panel.
 */
export function StaggerDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const stagger = motion.stagger.list;
  const elapsed = getElapsed(frame);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`enter(frame, ${START} + index * STAGGER)  STAGGER = ${formatReadout(stagger, 1)}`}
      readouts={[{ name: "elapsed", value: `${elapsed}f` }]}
    >
      <div className={css.timeline}>
        {SIBLINGS.map((name, index) => {
          return (
            <div key={name} className={css.timelineRow}>
              <span
                className={css.timelineName}
                style={motion.enter(frame, START + index * stagger)}
              >
                {`index ${index} @ ${formatReadout(index * stagger, 1)}f`}
              </span>
              <TimelineTrack
                startFrame={index * stagger}
                frames={motion.panel}
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
/** Stable keys of the wipe's columns. */
const COLUMN_IDS = Array.from({ length: COLUMNS }, (_, position) => {
  return `column-${position}`;
});
/** Frames the whole stepped wipe takes in this preview. */
const WIPE_FRAMES = 12;

/**
 * Eight columns rising the theme's column stagger apart (`STAGGER_COLUMN`
 * in `classic`), at sub-frame offsets.
 */
export function StaggerColumnDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const stagger = motion.stagger.column;
  const progress = getColumnWipeProgress(
    Math.max(0, frame - START),
    motion.scale(WIPE_FRAMES),
    {
      columns: COLUMNS,
      staggerFrames: stagger,
    },
    motion,
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getColumnWipeProgress(frame, ${WIPE_FRAMES}, { columns: ${COLUMNS}, staggerFrames: STAGGER_COLUMN })`}
      readouts={[
        { name: "STAGGER_COLUMN", value: formatReadout(stagger) },
        { name: "first", value: formatReadout(progress[0]) },
        { name: "last", value: formatReadout(progress[COLUMNS - 1]) },
      ]}
    >
      <div className={css.columns}>
        {progress.map((columnProgress, index) => {
          return (
            <div key={COLUMN_IDS[index]} className={css.columnCell}>
              <div className={css.columnTrack}>
                <span
                  className={css.columnFill}
                  style={{ height: `${(columnProgress * 100).toFixed(2)}%` }}
                />
              </div>
              <span
                className={css.caption}
              >{`${formatReadout(index * stagger, 1)}f`}</span>
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
