import { STOCK } from "../../stockPalette";
import { FractionMaterial } from "./FractionMaterial";
import type { Input } from "./FractionMaterialTranslation.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  representation: Input["representations"][number];
  x: number;
  y: number;
  frame: number;
  accent: string;
};
/** Draws the FractionSurface group with fixed authored geometry. */
export function FractionSurface({
  input,
  representation,
  x,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g
        data-work-surface={representation.id}
        transform={`translate(${x} ${y})`}
      >
        <path
          d="M-108 58 H108 M-98 58 V79 M98 58 V79"
          fill="none"
          stroke={STOCK.line}
          strokeWidth={3}
        />
        <FractionMaterial
          representation={representation}
          fraction={input.fraction}
          frame={frame}
          accent={accent}
        />
        {frame >= 88 && frame < 126
          ? Array.from({ length: input.fraction.numerator }, (_, part) => (
              <path
                key={part}
                d={`M${-96 + ((part + 0.5) * 192) / input.fraction.denominator} 30 V46`}
                stroke={accent}
                strokeWidth={1}
              />
            ))
          : undefined}
      </g>
    </>
  );
}
