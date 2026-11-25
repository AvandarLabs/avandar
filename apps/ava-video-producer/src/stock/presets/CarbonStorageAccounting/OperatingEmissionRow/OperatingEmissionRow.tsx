import { FitText } from "../../../primitives/FitText/FitText";
import { EmissionRibbon } from "./EmissionRibbon";
import { type Props } from "./OperatingEmissionRowShared/OperatingEmissionRowShared.types";
import type { ReactNode } from "react";
/** One CO2e source enters its own accounting ribbon without invented mass. */
export function OperatingEmissionRow({
  row,
  index,
  unit,
  frame,
}: Readonly<Props>): ReactNode {
  const copies: Array<[string, number, number, number, number]> = [
    [row.label, 540, 204 + index * 80, 170, 3],
    [String(row.tonnesCO2e), 730, 204 + index * 80, 180, 3],
    [unit, 730, 248 + index * 80, 180, 1],
  ];
  return (
    <g>
      {copies.map(([text, x, y, width, maxLines], ordinal) => {
        return (
          <FitText
            key={ordinal}
            text={text}
            x={x}
            y={y}
            width={width}
            fontSize={12}
            maxLines={maxLines}
            breakLongWords
            normalizeWhitespace
          />
        );
      })}
      <EmissionRibbon row={row} index={index} frame={frame} />
    </g>
  );
}
