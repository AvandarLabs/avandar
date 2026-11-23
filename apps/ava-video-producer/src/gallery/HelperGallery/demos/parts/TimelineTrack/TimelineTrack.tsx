import { clsx } from "clsx";
import { FRAME_WIDTH } from "../../getElapsed";
import css from "./TimelineTrack.module.css";
import type { ReactNode } from "react";

type Props = {
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
}: Readonly<Props>): ReactNode {
  const filled = Math.min(frames, Math.max(0, elapsed - startFrame));
  return (
    <div className={css.timelineTrack}>
      <span
        className={css.timelineTrackTimelineSpan}
        style={{ left: startFrame * frameWidth, width: frames * frameWidth }}
      >
        <span
          className={clsx(
            css.timelineTrackTimelineFill,
            isActive && css.timelineTrackTimelineFillActive,
          )}
          style={{ width: filled * frameWidth }}
        />
      </span>
      <span
        className={css.timelineTrackPlayhead}
        style={{ left: elapsed * frameWidth }}
      />
    </div>
  );
}
