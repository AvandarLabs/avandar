import { SteppedColumnWipe } from "../../../../storyboard/StoryFilm/SteppedColumnWipe/SteppedColumnWipe";
import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import { ColumnWipePreview } from "../ColumnWipePreview/ColumnWipePreview";
import { DemoTheme } from "../DemoTheme";
import { START } from "../getElapsed";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "../helperDemo.types";
import type { ReactNode } from "react";

const COLUMNS = 8;

/** Frames the whole stepped wipe takes in this preview. */
const WIPE_FRAMES = 12;

/** Renders StaggerColumnDemo for live helper catalog previews. */
export function StaggerColumnDemo({
  frame,
  frames,
}: Readonly<Props>): ReactNode {
  const motion = useVideoMotion();
  const stagger = motion.stagger.column;
  const progress = SteppedColumnWipe.getColumnWipeProgress({
    frame: Math.max(0, frame - START),
    durationInFrames: motion.scale(WIPE_FRAMES),
    options: { columns: COLUMNS, staggerFrames: stagger },
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getColumnWipeProgress({ frame, durationInFrames: ${WIPE_FRAMES}, options: { columns: ${COLUMNS}, staggerFrames: STAGGER_COLUMN } })`}
      readouts={[
        {
          name: "STAGGER_COLUMN",
          value: DemoTheme.formatReadout({ value: stagger }),
        },
        {
          name: "first",
          value: DemoTheme.formatReadout({ value: progress[0] }),
        },
        {
          name: "last",
          value: DemoTheme.formatReadout({ value: progress[COLUMNS - 1] }),
        },
      ]}
    >
      <ColumnWipePreview {...{ progress, stagger }} />
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
