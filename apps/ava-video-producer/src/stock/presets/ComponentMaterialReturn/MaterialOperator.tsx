import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getOperatorGripFromInputAndFrame } from "./getOperatorGripFromInputAndFrame";
import type { Input } from "./ComponentMaterialReturn.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * The operator approaches empty-handed, then grips and carries one whole part.
 */
export function MaterialOperator({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { x, y, index } = getOperatorGripFromInputAndFrame({
    motion,
    input,
    frame,
  });
  return (
    <g>
      <SketchedShape
        shape={{ kind: "circle", cx: x + 12, cy: y - 41, r: 6 }}
        profile={tokens.sketch.shape}
        data-operator-head="physical"
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 12} ${y - 35}v18l-7 10M${x + 12} ${y - 17}l7 10M${x + 12} ${y - 29}l8 10L${x + 12} ${y}`,
        }}
        profile={tokens.sketch.shape}
        data-operator-body="physical"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        fill="none"
      />
      <circle
        data-hand="contact"
        data-active-part={index}
        cx={x + 12}
        cy={y}
        r={3}
        fill={accent}
      />
    </g>
  );
}
