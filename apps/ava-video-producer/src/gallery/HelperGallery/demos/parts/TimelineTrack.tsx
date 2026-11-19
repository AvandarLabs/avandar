import clsx from "clsx";
import css from "../demos.module.css";
import { FRAME_WIDTH } from "../getElapsed";
import type { ReactNode } from "react";

type TrackProps = {
  startFrame: number;
  frames: number;
  elapsed: number;
  isActive?: boolean;
  frameWidth?: number;
};

/** A timeline track: a span that fills as the playhead passes it. */
export function TimelineTrack({
  startFrame,
  frames,
  elapsed,
  isActive = true,
  frameWidth = FRAME_WIDTH,
}: TrackProps): ReactNode {
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
