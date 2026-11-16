import { ramp } from "../../../../motion";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import { PushdownRow } from "../PushdownRow";
import type { Input } from "../PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

const GATE_CUE = 51;
const GATE_FRAMES = 44;

type Props = Readonly<{
  frame: number;
  row: Input["rows"][number];
  index: number;
  isRejected: boolean;
  accent: string;
}>;

/** An original row, with a gate closing in front of it when the predicate rejects it. */
export function PushdownSourceRow({
  frame,
  row,
  index,
  isRejected,
  accent,
}: Props): ReactNode {
  const style = useGraphicProps("PredicatePushdownBoundary", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const gates = ramp(
    frame,
    GATE_CUE,
    motion.scale(GATE_FRAMES),
    motion.travel.easing,
  );
  return (
    <g>
      <PushdownRow
        row={row}
        x={64}
        y={246 + index * 32}
        source
        accent={accent}
      />
      {isRejected ? (
        <path
          data-gate={row.id}
          d={`M${438 - 18 * gates} ${228 + index * 32} v32`}
          stroke={color.highlight}
          strokeWidth={style.gateWidth}
        />
      ) : undefined}
    </g>
  );
}
