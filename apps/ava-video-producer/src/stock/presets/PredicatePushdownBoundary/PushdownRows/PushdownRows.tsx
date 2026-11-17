import { mix, ramp } from "../../../../motion";
import { useGraphicMotion } from "../../../theme/useGraphicTheme/useGraphicTheme";
import { PushdownRow } from "../PushdownRow";
import { PushdownSourceRow } from "./PushdownSourceRow";
import type { Input } from "../PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };

const ROWS_CUE = 13;
const ROWS_FADE_FRAMES = 20;
const TRAVEL_CUE = 96;
const TRAVEL_FRAMES = 28;
const COPY_FADE_FRAMES = 4;
const SETTLE_CUE = 124;
const SETTLE_FRAMES = 15;

/** The authored rows that satisfy the predicate, in authored order. */
function _matchingRows(input: Input): Input["rows"] {
  return input.rows.filter((row) =>
    input.predicate.operator === ">="
      ? row.value >= input.predicate.threshold
      : row.value <= input.predicate.threshold,
  );
}

/** All originals remain visible while matching copies move as complete rows. */
export function PushdownRows({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const matches = _matchingRows(input);
  const matchedRows = new Set(matches);
  const travel = ramp(
    frame,
    TRAVEL_CUE,
    motion.scale(TRAVEL_FRAMES),
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
        <PushdownSourceRow
          key={row.id}
          frame={frame}
          row={row}
          index={index}
          isRejected={!matchedRows.has(row)}
          accent={accent}
        />
      ))}
    </g>
  );
}
