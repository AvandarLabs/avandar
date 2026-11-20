import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
      <FitText
        text={input.copy.net}
        x={540}
        y={446}
        width={380}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <SketchedShape
        shape={{ kind: "path", d: "M535 490 V550 H925 V490" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {[retained, emissions, retained - emissions].map((value, index) => {
        return (
          // prettier-ignore
          // The three slots always mean retained mass, emissions
          // and their difference, in that order. Only their values
          // change.
          // react-doctor-disable-next-line no-array-index-as-key
          <FitText key={index}
            text={String(value)}
            x={540 + index * 135}
            y={510}
            width={110}
            fontSize={12}
            maxLines={3}
            breakLongWords
            normalizeWhitespace
          />
        );
      })}
      <text
        x={658}
        y={515}
        fill={tokens.color.text}
        fontFamily={tokens.text.graphic.secondary.fontFamily}
        fontWeight={tokens.text.graphic.secondary.fontWeight}
        fontSize={tokens.text.graphic.secondary.fontSize}
      >
        −
      </text>
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
