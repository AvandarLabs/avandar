import clsx from "clsx";
import { DUR, STAGGER, STAGGER_COLUMN, enter } from "../../../motion";
import { getColumnWipeProgress } from "../../../storyboard/StoryFilm/steppedColumnWipe";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";

/** Frame the shared timeline's playhead starts at. */
const START = 10;
/** Frames shown on the shared ruler. */
const RULER_FRAMES = 20;
/** Pixels per frame on the shared ruler. */
const FRAME_WIDTH = 30;

/** The duration tokens, shortest first, as the shared timeline lists them. */
const DURATION_ORDER = (Object.keys(DUR) as Array<keyof typeof DUR>).sort(
  (first, second) => DUR[first] - DUR[second],
);

/** Elapsed frames since the playhead started, held at the ruler's end. */
function _getElapsed(frame: number): number {
  return Math.min(RULER_FRAMES, Math.max(0, frame - START));
}

/** A frame ruler under the shared timeline, labelled every 5 frames. */
function Ruler({ frameWidth = FRAME_WIDTH, frames = RULER_FRAMES }) {
  return (
    <div className={css.timelineRow}>
      <span />
      <div className={css.ruler}>
        {Array.from({ length: frames + 1 }, (_, index) => (
          <span key={`tick-${index * frameWidth}`}>
            <span
              className={css.rulerTick}
              style={{ left: index * frameWidth }}
            />
            {index % 5 === 0 ? (
              <span
                className={css.rulerLabel}
                style={{ left: index * frameWidth }}
              >
                {index}f
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

type TrackProps = {
  startFrame: number;
  frames: number;
  elapsed: number;
  isActive?: boolean;
  frameWidth?: number;
};

/** A timeline track: a span that fills as the playhead passes it. */
function TimelineTrack({
  startFrame,
  frames,
  elapsed,
  isActive = true,
  frameWidth = FRAME_WIDTH,
}: TrackProps) {
  const filled = Math.min(frames, Math.max(0, elapsed - startFrame));
  return (
    <div className={css.timelineTrack}>
      <span
        className={css.timelineSpan}
        style={{ left: startFrame * frameWidth, width: frames * frameWidth }}
      >
        <span
          className={clsx(css.timelineFill, isActive && css.timelineFillActive)}
          style={{ width: filled * frameWidth }}
        />
      </span>
      <span className={css.playhead} style={{ left: elapsed * frameWidth }} />
    </div>
  );
}

/** Every `DUR` token on one timeline, with `token` highlighted. */
export function createDurationDemo(token: keyof typeof DUR) {
  return function DurationDemo({ frame, frames }: HelperDemoProps) {
    const elapsed = _getElapsed(frame);
    return (
      <HelperDemoFrame
        frame={frame}
        frames={frames}
        label={`DUR.${token} = ${DUR[token]}`}
        readouts={[
          { name: "frames", value: String(DUR[token]) },
          { name: "ms", value: String(Math.round((DUR[token] / 30) * 1000)) },
          { name: "elapsed", value: `${elapsed}f` },
        ]}
      >
        <div className={css.timeline}>
          {DURATION_ORDER.map((name) => (
            <div key={name} className={css.timelineRow}>
              <span
                className={clsx(
                  css.timelineName,
                  name === token && css.timelineNameActive,
                )}
              >
                {`DUR.${name} ${DUR[name]}f`}
              </span>
              <TimelineTrack
                startFrame={0}
                frames={DUR[name]}
                elapsed={elapsed}
                isActive={name === token}
              />
            </div>
          ))}
          <Ruler />
        </div>
      </HelperDemoFrame>
    );
  };
}

const SIBLINGS = ["first", "second", "third", "fourth", "fifth", "sixth"];

/** Six siblings starting `STAGGER` frames apart, each lasting a panel. */
export function StaggerDemo({ frame, frames }: HelperDemoProps) {
  const elapsed = _getElapsed(frame);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`enter(frame, ${START} + index * STAGGER)  STAGGER = ${STAGGER}`}
      readouts={[{ name: "elapsed", value: `${elapsed}f` }]}
    >
      <div className={css.timeline}>
        {SIBLINGS.map((name, index) => (
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
        ))}
        <Ruler />
      </div>
    </HelperDemoFrame>
  );
}

const COLUMNS = 8;
/** Frames the whole stepped wipe takes in this preview. */
const WIPE_FRAMES = 12;

/** Eight columns rising `STAGGER_COLUMN` frames apart, at sub-frame offsets. */
export function StaggerColumnDemo({ frame, frames }: HelperDemoProps) {
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
        {progress.map((columnProgress, index) => (
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
            <span className={css.caption}>{`${index * STAGGER_COLUMN}f`}</span>
          </div>
        ))}
      </div>
    </HelperDemoFrame>
  );
}
