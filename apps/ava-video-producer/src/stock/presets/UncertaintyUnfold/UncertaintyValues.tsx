import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./UncertaintyUnfold.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  lowerX: number;
  upperX: number;
  pointX: number;
  opacity: number;
};
/**
 * External value slots retain endpoint ownership even for coincident
 * markers.
 */
export function UncertaintyValues({
  input,
  lowerX,
  upperX,
  pointX,
  opacity,
}: Readonly<Props>): ReactNode {
  const values = [
    { value: input.estimate.lower, x: lowerX, slot: 100 },
    { value: input.estimate.point, x: pointX, slot: 480 },
    { value: input.estimate.upper, x: upperX, slot: 860 },
  ];
  return (
    <g opacity={opacity}>
      {values.map(({ value, x, slot }, index) => (
        <g key={index}>
          <path d={`M${x} 326 L${slot} 362`} stroke={STOCK.line} fill="none" />
          <FitText
            text={String(value)}
            x={slot}
            y={384}
            width={228}
            fontSize={12}
            maxLines={2}
            anchor={index === 0 ? "start" : index === 2 ? "end" : "middle"}
            normalizeWhitespace
            breakLongWords
          />
        </g>
      ))}
    </g>
  );
}
