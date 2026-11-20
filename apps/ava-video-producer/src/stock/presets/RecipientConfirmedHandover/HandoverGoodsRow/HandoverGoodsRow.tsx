import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { HandoverUnit } from "../HandoverUnit/HandoverUnit";
import { QuantityLine } from "./QuantityLine";
import type { Input } from "../RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
/** One offered-good row preserves its full units and optional quantity list. */
export function HandoverGoodsRow({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const content = input.contents[index];
  return (
    <g>
      <FitText
        text={content.label}
        x={40}
        y={182 + index * 80}
        width={142}
        fontSize={12}
        maxLines={4}
        normalizeWhitespace
        breakLongWords
      />
      <SketchedShape
        shape={{ kind: "path", d: `M190 ${210 + index * 80} H335` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      {input.showQuantityList ? (
        <QuantityLine content={content} index={index} />
      ) : undefined}
      {Array.from({ length: content.offeredUnits }, (_, unitIndex) => {
        return (
          <HandoverUnit
            key={unitIndex}
            input={input}
            frame={frame}
            contentIndex={index}
            unitIndex={unitIndex}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
