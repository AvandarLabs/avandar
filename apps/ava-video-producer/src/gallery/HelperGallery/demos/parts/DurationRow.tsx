import { clsx } from "clsx";
import css from "../demos.module.css";
import { DemoTheme } from "../DemoTheme";
import { TimelineTrack } from "./TimelineTrack";
import type { ReactNode } from "react";

type DurationRowProps = Readonly<{
  name: string;
  frames: number;
  isActive: boolean;
  elapsed: number;
}>;

/** One duration step's name and its track on the timeline. */
export function DurationRow({
  name,
  frames,
  isActive,
  elapsed,
}: DurationRowProps): ReactNode {
  return (
    <div className={css.timelineRow}>
      <span
        className={clsx(css.timelineName, isActive && css.timelineNameActive)}
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
