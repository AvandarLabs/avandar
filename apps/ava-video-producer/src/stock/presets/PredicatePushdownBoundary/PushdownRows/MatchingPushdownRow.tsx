import { Motion } from "../../../../motion";
import { PushdownRow } from "../PushdownRow";
import type { usePushdownRowsPresentation } from "./usePushdownRowsPresentation";
import type { ReactNode } from "react";

const TRAVEL_CUE = 96;
const COPY_FADE_FRAMES = 4;
type Props = Pick<
  ReturnType<typeof usePushdownRowsPresentation>,
  "travel" | "settle" | "input" | "motion" | "frame" | "accent"
> & {
  row: ReturnType<typeof usePushdownRowsPresentation>["matches"][number];
  index: number;
};
/** Render one matching pushdown row. */
export function MatchingPushdownRow(props: Readonly<Props>): ReactNode {
  return (
    <PushdownRow
      key={props.row.id}
      row={props.row}
      x={Motion.mix({ t: props.travel, from: 64, to: 580 })}
      y={Motion.mix({
        t: props.settle,
        from: 246 + props.input.rows.indexOf(props.row) * 32,
        to: 246 + props.index * 32,
      })}
      source={false}
      opacity={props.motion.ramp(
        props.frame,
        TRAVEL_CUE,
        props.motion.scale(COPY_FADE_FRAMES),
      )}
      accent={props.accent}
    />
  );
}
