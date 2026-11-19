import { mix, mixToken } from "../../motion";
import { useVideoTokens } from "../../videoTheme/useVideoTheme";
import { formatMetric } from "../layout/layout";
import { PAIR_BOXES } from "./windowTilt";
import type { RaceColumn, TiltedWindowSceneProps } from "../scenes.types";
import type { WindowStage } from "./windowMotion";
import type { CSSProperties, ReactNode } from "react";

type Props = TiltedWindowSceneProps & {
  width: number;
  height: number;
  column: RaceColumn;
  side: number;
  labelsAt: number;
  stage: WindowStage;
};

/** The parts of one column's stats every line shares. */
type StatLineProps = Readonly<{
  width: number;
  height: number;
  side: number;
  fontWeight: CSSProperties["fontWeight"];
  arrive: CSSProperties;
}>;

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

/** The left edge of a column's label and counter. */
function _getStatLeft({ side, width }: StatLineProps): number {
  return PAIR_BOXES[side].x * width + width * 0.027;
}

function RaceLabel({
  label,
  ...line
}: StatLineProps & Readonly<{ label: string }>): ReactNode {
  return (
    <div
      style={{
        position: "absolute",
        left: _getStatLeft(line),
        top: line.height * 0.085,
        fontSize: line.height * 0.05,
        fontWeight: line.fontWeight,
        ...line.arrive,
      }}
    >
      {label}
    </div>
  );
}

function RaceBadge({
  badge,
  ...line
}: StatLineProps & Readonly<{ badge: string }>): ReactNode {
  const tokens = useVideoTokens();
  return (
    <div
      style={{
        position: "absolute",
        right: line.width * 0.04,
        top: line.height * 0.095,
        fontSize: line.height * 0.026,
        fontWeight: line.fontWeight,
        color: tokens.color.scene.brand,
        ...line.arrive,
      }}
    >
      {badge}
    </div>
  );
}

/**
 * How far the counter has run, linearly, and how far it has turned to the
 * brand colour since finishing, both 0 to 1.
 */
function _getCounterProgress(
  frame: number,
  counter: RaceColumn["counter"],
  motion: WindowStage["motion"],
) {
  return {
    elapsed: motion.ramp(
      frame,
      counter.startFrame,
      counter.endFrame - counter.startFrame,
      (t) => {
        return t;
      },
    ),
    done: motion.ramp(
      frame,
      counter.endFrame,
      motion.chip,
      motion.entrance.easing,
    ),
  };
}

/** The live counter, turning to the brand colour as it finishes. */
function RaceCounter({
  frame,
  counter,
  motion,
  ...line
}: StatLineProps &
  Readonly<{
    frame: number;
    counter: RaceColumn["counter"];
    motion: WindowStage["motion"];
  }>): ReactNode {
  const scene = useVideoTokens().color.scene;
  const { elapsed, done } = _getCounterProgress(frame, counter, motion);
  return (
    <div
      style={{
        position: "absolute",
        left: _getStatLeft(line),
        top: line.height * 0.825,
        fontSize: line.height * 0.1,
        fontWeight: line.fontWeight,
        fontVariantNumeric: "tabular-nums",
        color: mixToken(done, scene.foreground, scene.brand),
        ...line.arrive,
      }}
    >
      {formatMetric(
        mix(elapsed, counter.from ?? 0, counter.to),
        counter.precision ?? 1,
      )}
      {counter.unit ?? ""}
    </div>
  );
}

/** The stat under the window, right-aligned to its edge. */
function RaceStat({
  stat,
  ...line
}: StatLineProps & Readonly<{ stat: string }>): ReactNode {
  const tokens = useVideoTokens();
  const box = PAIR_BOXES[line.side];
  return (
    <div
      style={{
        position: "absolute",
        right: line.width * (1 - box.x - box.width) + line.width * 0.01,
        top: line.height * 0.885,
        fontSize: line.height * 0.026,
        color: tokens.color.scene.mutedForeground,
        ...line.arrive,
      }}
    >
      {stat}
    </div>
  );
}
