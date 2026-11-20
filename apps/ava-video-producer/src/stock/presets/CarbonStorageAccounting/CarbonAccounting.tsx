import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CarbonNetAccounting } from "./CarbonNetAccounting";
import { OperatingEmissionRow } from "./OperatingEmissionRow/OperatingEmissionRow";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const retained =
    input.capture.capturedTonnesCO2 - input.capture.releasedTonnesCO2;
  const emissions = input.operatingEmissions.reduce((sum, row) => {
    return sum + row.tonnesCO2e;
  }, 0);
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
      {input.operatingEmissions.map((row, index) => {
        return (
          <OperatingEmissionRow
            key={row.id}
            row={row}
            index={index}
            unit={input.copy.accountingUnit}
            frame={frame}
          />
        );
      })}
      {input.showNetAccounting && frame >= 108 ? (
        <CarbonNetAccounting
          input={input}
          retained={retained}
          emissions={emissions}
        />
      ) : undefined}
      <SketchedShape
        shape={{ kind: "path", d: "M918 183 V442 H900" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        fill="none"
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
