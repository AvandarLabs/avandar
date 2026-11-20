import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { JigPattern } from "../JigPattern";
import { GuideCarryArm } from "./GuideCarryArm";
import type { getJigSceneFromFrame } from "../getJigSceneFromFrame";
import type { Input } from "../SharedJigPreparation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; scene: ReturnType<typeof getJigSceneFromFrame> };
/** One reusable guide keeps its label, selected pattern and holding hand. */
export function JigGuide({ input, scene }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      <FitText
        text={input.guide.label}
        x={Math.min(690, scene.guideX)}
        y={132}
        width={220}
        fontSize={14}
        maxLines={3}
        color={tokens.color.highlight}
        normalizeWhitespace
        breakLongWords
      />
      <g data-guide="one">
        <JigPattern
          x={scene.guideX}
          y={scene.guideY}
          pattern={input.guide.pattern}
          progress={scene.formed}
          isGuide
          color={tokens.color.highlight}
        />
      </g>
      <GuideCarryArm guideX={scene.guideX} />
    </g>
  );
}
