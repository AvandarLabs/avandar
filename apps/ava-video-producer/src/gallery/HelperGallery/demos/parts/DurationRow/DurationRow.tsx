import { clsx } from "clsx";
import { DemoTheme } from "../../DemoTheme";
import { TimelineTrack } from "../TimelineTrack/TimelineTrack";
import css from "./DurationRow.module.css";
import type { ReactNode } from "react";

type Props = {
  name: string;
  frames: number;
  isActive: boolean;
  elapsed: number;
};

/** One duration step's name and its track on the timeline. */
export function DurationRow({
  name,
  frames,
  isActive,
  elapsed,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.durationRowTimelineRow}>
      <span
        className={clsx(
          css.durationRowTimelineName,
          isActive && css.durationRowTimelineNameActive,
        )}
      >
        {`DUR.${name} ${DemoTheme.formatReadout({ value: frames, digits: 1 })}f`}
      </span>
      <TimelineTrack
        startFrame={0}
        frames={frames}
        elapsed={elapsed}
        isActive={isActive}
      />
    </div>
  );
}
