import { mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SealedHandoff.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input };
/**
 * The intact brief slides into its enclosure. Its text never fades to simulate
 * concealment.
 */
export function HandoffBrief({ frame, input }: Readonly<Props>): ReactNode {
  const y = mix(ramp(frame, 36, 12), -54, 16);
  return (
    <g data-brief-content="retained">
      <rect
        data-brief-paper="intact"
        x={24}
        y={y}
        width={488}
        height={246}
        fill={STOCK.ground}
        stroke={STOCK.line}
      />
      {input.brief.map(({ id, line }, index) => (
        <g key={id} data-brief-line={id}>
          {input.showLabels ? (
            <FitText
              text={line}
              x={36}
              y={y + 24 + index * 48}
              width={464}
              fontSize={14}
              maxLines={2}
              normalizeWhitespace
              breakLongWords
            />
          ) : (
            <path
              d={`M36 ${y + 24 + index * 48} h448 M36 ${y + 38 + index * 48} h336`}
              stroke={STOCK.muted}
              strokeWidth={3}
            />
          )}
        </g>
      ))}
    </g>
  );
}
