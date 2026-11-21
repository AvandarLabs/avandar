import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CarbonNetAccountingNetLabel } from "./CarbonNetAccountingNetLabel/CarbonNetAccountingNetLabel";
import { CarbonNetQuantities } from "./CarbonNetQuantities/CarbonNetQuantities";
import { CarbonNetSubtractionMark } from "./CarbonNetSubtractionMark/CarbonNetSubtractionMark";
import type { Input } from "./CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

type Props = { input: Input; retained: number; emissions: number };
/** Exact retained-minus-operating subtraction preserves every result sign. */
export function CarbonNetAccounting({
  input,
  retained,
  emissions,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-net={retained - emissions}>
      <CarbonNetAccountingNetLabel input={input} />
      <SketchedShape
        shape={{ kind: "path", d: "M535 490 V550 H925 V490" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <CarbonNetQuantities retained={retained} emissions={emissions} />
      <CarbonNetSubtractionMark tokens={tokens} />
      <text
        x={793}
        y={515}
        fill={tokens.color.text}
        fontFamily={tokens.text.graphic.secondary.fontFamily}
        fontWeight={tokens.text.graphic.secondary.fontWeight}
        fontSize={tokens.text.graphic.secondary.fontSize}
      >
        =
      </text>
      <FitText
        text={input.copy.accountingUnit}
        x={540}
        y={568}
        width={380}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
