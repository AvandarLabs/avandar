import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";

type Props = { input: Input; threshold: number };
/**
 * The moving boundary and optional fixed-value ticks share one numeric domain.
 */
export function ClassRuler({ input, threshold }: Readonly<Props>): ReactNode {
  const min = input.schemes[0].breaks[0],
    max = input.schemes[0].breaks[2];
  const x = 64 + 424 * normalizeFiniteRange({ value: threshold, min, max });
  return (
    <g>
      <path d="M64 538 H488" stroke={STOCK.line} />
      <line
        data-threshold="true"
        data-value={threshold}
        x1={x}
        x2={x}
        y1={514}
        y2={562}
        stroke={STOCK.orange}
        strokeWidth={3}
      />
      {input.showValueRuler
        ? input.zones.map((zone, index) =>
            zone.value === null ? undefined : (
              <circle
                key={zone.id}
                data-value-tick={zone.id}
                cx={
                  64 +
                  424 * normalizeFiniteRange({ value: zone.value, min, max })
                }
                cy={538}
                r={4 + (index % 2)}
                fill={STOCK.text}
              />
            ),
          )
        : undefined}
    </g>
  );
}
