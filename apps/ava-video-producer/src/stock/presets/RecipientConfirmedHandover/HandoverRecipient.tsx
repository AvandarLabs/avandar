import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getRecipientPoseFromInputAndFrame } from "./getRecipientPoseFromInputAndFrame";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * A recipient-controlled hand remains attached throughout each counted pull.
 */
export function HandoverRecipient({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { x, y, handX, handY } = getRecipientPoseFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      <PersonGlyph x={x} y={y} size={30} color={accent} />
      <g data-recipient-arm>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x} ${y} L${x - 12} ${handY + 9} L${handX} ${handY}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(2.5)}
          strokeLinecap="round"
        />
      </g>
      <circle data-recipient-hand cx={handX} cy={handY} r={3} fill={accent} />
    </g>
  );
}
