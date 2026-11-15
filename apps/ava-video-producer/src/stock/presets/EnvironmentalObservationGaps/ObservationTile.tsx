import { ramp, mix, EASE } from "../../../motion";
import { Text } from "../../graphics-common";
import { STOCK } from "../../stockPalette";
import { makeObservationLayoutFromInput } from "./makeObservationLayoutFromInput";
import { ObservationCell } from "./ObservationCell";
import type { Input } from "./EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";
/** Inputs for ObservationTile. */
type Props = { frame: number; accent: string; id: string; input: Input };

/**
 * A lifting cloud sheet reveals readings without replacing the missing cells.
 */
export function ObservationTile({
  frame,
  accent,
  id,
  input,
}: Readonly<Props>): ReactNode {
  const { cells, checks } = makeObservationLayoutFromInput(input);
  const lift = ramp(frame, 36, 20, EASE.inOut),
    unfold = ramp(frame, 16, 18, EASE.inOut);
  const patternId = `${id}-missing-hatch`;
  return (
    <g opacity={unfold} transform={`translate(0 ${mix(unfold, 12, 0)})`}>
      <defs>
        <pattern
          id={patternId}
          width={8}
          height={8}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6"
            stroke={STOCK.muted}
            strokeWidth={1}
          />
        </pattern>
      </defs>
      {cells.map((cell) => (
        <ObservationCell
          key={cell.id}
          cell={cell}
          metric={input.metric}
          accent={accent}
          patternId={patternId}
        />
      ))}
      <g
        data-cloud-layer="true"
        opacity={1 - lift}
        transform={`translate(0 ${-14 * lift})`}
      >
        <rect
          x={270}
          y={105}
          width={650}
          height={300}
          rx={18}
          fill={STOCK.elevated}
        />
        <path
          d="M 285 170 Q 350 130 415 170 T 675 170 T 905 170 M 285 290 Q 350 250 415 290 T 675 290 T 905 290"
          stroke={STOCK.muted}
          strokeWidth={12}
          fill="none"
        />
      </g>
      {checks.map((check, index) =>
        frame >= 70 + index * 18 ? (
          <g key={check.id}>
            <circle
              data-point-check={check.id}
              cx={check.x}
              cy={check.y}
              r={5}
              fill={STOCK.orange}
              stroke={STOCK.ground}
              strokeWidth={1}
            />
            <Text x={check.x + 8} y={check.y + 4} size={12} fill={STOCK.orange}>
              {check.key}
            </Text>
          </g>
        ) : undefined,
      )}
    </g>
  );
}
