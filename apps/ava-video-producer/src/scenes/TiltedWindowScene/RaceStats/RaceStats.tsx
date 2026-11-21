import { useVideoTokens } from "../../../videoTheme/videoThemeHelpers";
import { type WindowStage } from "../WindowMotion/WindowMotion.types";
import { RaceBadge } from "./RaceBadge";
import { RaceCounter } from "./RaceCounter";
import { RaceLabel } from "./RaceLabel";
import { RaceStat } from "./RaceStat";
import { type StatLineProps } from "./RaceStatsShared/RaceStatsShared.types";
import type { RaceColumn, TiltedWindowSceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = TiltedWindowSceneProps & {
  width: number;
  height: number;
  column: RaceColumn;
  side: number;
  labelsAt: number;
  stage: WindowStage;
};
/**
 * One column's label, counter and stat, outside the flipping card, in the
 * `text.stage.windowHeadline` weight. The counter turns from the foreground
 * to the brand colour as it finishes.
 */
export function RaceStats({
  frame,
  column,
  side,
  width,
  height,
  badge,
  labelsAt,
  exit,
  stage,
}: Props): ReactNode {
  const tokens = useVideoTokens();
  const { motion } = stage;
  const fade = exit
    ? 1 -
      motion.ramp(frame, exit.atFrame + 1, motion.chip, motion.dissolve.easing)
    : 1;
  const line: StatLineProps = {
    width,
    height,
    side,
    fontWeight: tokens.text.stage.windowHeadline.fontWeight,
    arrive: motion.enter(frame, labelsAt, { y: 0 }),
  };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      <RaceLabel {...line} label={column.label} />
      {badge && side === 1 ? <RaceBadge {...line} badge={badge} /> : null}
      <RaceCounter
        {...line}
        frame={frame}
        counter={column.counter}
        motion={motion}
      />
      {column.stat ? <RaceStat {...line} stat={column.stat} /> : null}
    </div>
  );
}
