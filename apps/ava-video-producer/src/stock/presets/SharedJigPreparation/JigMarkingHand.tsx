import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getJigSceneFromFrame } from "./getJigSceneFromFrame";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; scene: ReturnType<typeof getJigSceneFromFrame> };
/**
 * The collaborator's marking hand and tool contact the selected open cutout.
 */
export function JigMarkingHand({ input, scene }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const index = scene.activeIndex;
  if (index < 0 || scene.guideX !== scene.centers[index] - 50) {
    return null;
  }
  const x = scene.centers[index];
  const { handX, handY, tool } = _getMarkingHand({ input, scene });
  return (
    <g>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 10} 280 L${x + 30} 310 L${handX} ${handY}`,
        }}
        profile={tokens.sketch.shape}
        data-marking-arm={input.collaborators[index].id}
        fill="none"
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{ kind: "path", d: tool }}
        profile={tokens.sketch.shape}
        data-marking-tool={input.collaborators[index].id}
        stroke={tokens.color.text}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        strokeLinecap="round"
      />
      <circle
        data-marking-hand={input.collaborators[index].id}
        cx={handX}
        cy={handY}
        r={5}
        fill={tokens.color.accentAlt}
      />
    </g>
  );
}
/** The marking hand on the guide, and the tool it holds against the cutout. */
function _getMarkingHand({
  input,
  scene,
}: Readonly<{ input: Input; scene: Props["scene"] }>) {
  const isCornerMark = input.guide.pattern === "corner-mark";
  const handX = scene.guideX + (isCornerMark ? 11 : 70);
  const handY = scene.guideY + (isCornerMark ? 11 : 32);
  return {
    handX,
    handY,
    tool: isCornerMark
      ? `M${handX - 10} ${handY - 10} L${scene.guideX + 22} ${scene.guideY + 22}`
      : `M${handX + 10} ${handY - 18} L${handX} ${handY}`,
  };
}
