import { FitText } from "../../primitives/FitText/FitText";
import { CarbonNetAccounting } from "./CarbonNetAccounting";
import { OperatingEmissionRow } from "./OperatingEmissionRow";
import type { Input } from "./CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Separate operating CO2e rows enter a signed retained-minus-emissions bracket.
 */
export function CarbonAccounting({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const retained =
    input.capture.capturedTonnesCO2 - input.capture.releasedTonnesCO2;
  const emissions = input.operatingEmissions.reduce(
    (sum, row) => sum + row.tonnesCO2e,
    0,
  );
  return (
    <g data-emissions={emissions}>
      <FitText
        text={input.copy.operations}
        x={540}
        y={150}
        width={380}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      {input.operatingEmissions.map((row, index) => (
        <OperatingEmissionRow
          key={row.id}
          row={row}
          index={index}
          unit={input.copy.accountingUnit}
          frame={frame}
        />
      ))}
      {input.showNetAccounting && frame >= 108 ? (
        <CarbonNetAccounting
          input={input}
          retained={retained}
          emissions={emissions}
        />
      ) : undefined}
      <path
        d="M918 183 V442 H900"
        stroke={accent}
        fill="none"
        strokeWidth={2}
      />
    </g>
  );
}
