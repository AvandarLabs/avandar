import { Text } from "../../graphics-common";
import { STOCK } from "../../stockPalette";
import { makeGridSceneFromInputAndFrame } from "./makeGridSceneFromInputAndFrame";
import type { Input } from "./SpatialGridBinning.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Moving count tokens are painted above cell shading and ledger outlines. */
export function GridTokens({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { points } = makeGridSceneFromInputAndFrame({ input, frame });
  return (
    <g>
      {input.showPointGhosts
        ? points.map((point) => (
            <circle
              key={point.id}
              data-source-ghost={point.id}
              cx={point.sourceX}
              cy={point.sourceY}
              r={4}
              fill={STOCK.muted}
              opacity={0.35}
            />
          ))
        : undefined}
      {points.map((point) => (
        <g key={point.id}>
          <circle
            data-count-token={point.id}
            data-token-cell={point.cell}
            cx={point.x}
            cy={point.y}
            r={8.5}
            fill={accent}
            fillOpacity={0.2}
            stroke={accent}
          />
          <Text x={point.x} y={point.y + 4} size={12} anchor="middle">
            {point.index + 1}
          </Text>
        </g>
      ))}
    </g>
  );
}
