import { mix, ramp } from "../../../motion";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme";
import { PushdownRow } from "./PushdownRow";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };

const ROWS_CUE = 13;
const ROWS_FADE_FRAMES = 20;
const GATE_CUE = 51;
const GATE_FRAMES = 44;
const TRAVEL_CUE = 96;
const TRAVEL_FRAMES = 28;
const COPY_FADE_FRAMES = 4;
const SETTLE_CUE = 124;
const SETTLE_FRAMES = 15;

/** All originals remain visible while matching copies move as complete rows. */
export function PushdownRows({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("PredicatePushdownBoundary", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const matches = input.rows.filter((row) =>
    input.predicate.operator === ">="
      ? row.value >= input.predicate.threshold
      : row.value <= input.predicate.threshold,
  );
  const travel = ramp(
    frame,
    TRAVEL_CUE,
    motion.scale(TRAVEL_FRAMES),
    motion.travel.easing,
  );
  const gates = ramp(
    frame,
    GATE_CUE,
    motion.scale(GATE_FRAMES),
    motion.travel.easing,
  );
  const settle = ramp(
    frame,
    SETTLE_CUE,
    motion.scale(SETTLE_FRAMES),
    motion.travel.easing,
  );
  return (
    <g opacity={ramp(frame, ROWS_CUE, motion.scale(ROWS_FADE_FRAMES))}>
      {matches.map((row, index) => (
        <PushdownRow
          key={row.id}
          row={row}
          x={mix(travel, 64, 580)}
          y={mix(settle, 246 + input.rows.indexOf(row) * 32, 246 + index * 32)}
          source={false}
          opacity={ramp(frame, TRAVEL_CUE, motion.scale(COPY_FADE_FRAMES))}
          accent={accent}
        />
      ))}
      {input.rows.map((row, index) => (
        <g key={row.id}>
          <PushdownRow
            row={row}
            x={64}
            y={246 + index * 32}
            source
            accent={accent}
          />
          {!matches.includes(row) ? (
            <path
              data-gate={row.id}
              d={`M${438 - 18 * gates} ${228 + index * 32} v32`}
              stroke={color.highlight}
              strokeWidth={style.gateWidth}
            />
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
