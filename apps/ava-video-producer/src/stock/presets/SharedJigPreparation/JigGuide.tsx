import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { JigPattern } from "./JigPattern";
import type { getJigSceneFromFrame } from "./getJigSceneFromFrame";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; scene: ReturnType<typeof getJigSceneFromFrame> };
/** One reusable guide keeps its label, selected pattern and holding hand. */
export function JigGuide({ input, scene }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
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

/** The arm and hand holding the guide. */
function GuideCarryArm({ guideX }: Readonly<{ guideX: number }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${guideX} 440 L${guideX - 20} 430 L${guideX} 382`,
        }}
        profile={tokens.sketch.shape}
        data-carry-arm="true"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
      />
      <circle
        data-guide-hand="true"
        cx={guideX}
        cy={382}
        r={5}
        fill={tokens.color.highlight}
      />
    </>
  );
}
