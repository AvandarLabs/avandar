import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

type Props = {
  row: Input["operatingEmissions"][number];
  index: number;
  unit: string;
  frame: number;
};
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
      {copies.map(([text, x, y, width, maxLines], ordinal) => (
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
      ))}
      <path
        data-operation-ribbon={row.id}
        data-tonnes={row.tonnesCO2e}
        d={`M540 ${264 + index * 80} H${mix(ramp(frame, 60, 48, EASE.inOut), 540, 918)}`}
        stroke={STOCK.orange}
        strokeWidth={16 * (row.tonnesCO2e / 1000)}
        fill="none"
      />
    </g>
  );
}
