import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./CarbonStorageAccounting.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Full physical mass labels retain exact finite values and separate units. */
export function CarbonPhysicalLabels({ input }: Readonly<Props>): ReactNode {
  const retained =
    input.capture.capturedTonnesCO2 - input.capture.releasedTonnesCO2;
  const copies: Array<[string, number, number, number, number, "end"?]> = [
    [input.copy.air, 50, 230, 130, 5],
    [input.copy.capture, 195, 225, 155, 4],
    [String(input.capture.capturedTonnesCO2), 236, 386, 185, 3, "end"],
    [input.copy.massUnit, 236, 422, 185, 1, "end"],
    [input.copy.released, 365, 225, 135, 5],
    [String(input.capture.releasedTonnesCO2), 365, 310, 135, 3],
    [input.copy.massUnit, 365, 390, 150, 1],
    [input.copy.retained, 50, 446, 185, 4],
    [String(retained), 50, 512, 185, 3],
    [input.copy.massUnit, 50, 548, 185, 1],
  ];
  return (
    <g>
      {copies.map(([text, x, y, width, maxLines, anchor], index) => (
        <FitText
          key={index}
          text={text}
          x={x}
          y={y}
          width={width}
          fontSize={12}
          maxLines={maxLines}
          anchor={anchor}
          breakLongWords
          normalizeWhitespace
        />
      ))}
    </g>
  );
}
