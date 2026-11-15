import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { JigPattern } from "./JigPattern";
import type { getJigSceneFromFrame } from "./getJigSceneFromFrame";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; scene: ReturnType<typeof getJigSceneFromFrame> };
/** One reusable guide keeps its label, selected pattern and holding hand. */
export function JigGuide({ input, scene }: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.guide.label}
        x={Math.min(690, scene.guideX)}
        y={132}
        width={220}
        fontSize={14}
        maxLines={3}
        color={STOCK.orange}
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
          color={STOCK.orange}
        />
      </g>
      <path
        data-carry-arm="true"
        d={`M${scene.guideX} 440 L${scene.guideX - 20} 430 L${scene.guideX} 382`}
        stroke={STOCK.orange}
        strokeWidth={3}
        fill="none"
      />
      <circle
        data-guide-hand="true"
        cx={scene.guideX}
        cy={382}
        r={5}
        fill={STOCK.orange}
      />
    </g>
  );
}
