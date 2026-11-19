import { mix } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { PracticeStrip } from "./PracticeStrip";
import type { getRehearsalFromFrame } from "./getRehearsalFromFrame";
import type { Input } from "./SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getRehearsalFromFrame>;
  accent: string;
};
/**
 * The learner handles the locker and holds an optional authored practice strip.
 */
export function PracticePeople({
  input,
  scene,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const { learnerX, companionX, doorWidth, touch, finalStep } = scene;
  return (
    <g>
      <PersonGlyph x={companionX} y={390} color={tokens.color.accentAlt} />
      <circle
        data-companion=""
        cx={companionX}
        cy={376}
        r={7}
        fill={tokens.color.accentAlt}
      />
      <g data-support-gesture={input.finalStepSupport}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${companionX} 390 L${companionX + mix(finalStep, 20, input.finalStepSupport === "alongside" ? 40 : 12)} ${mix(finalStep, 398, input.finalStepSupport === "alongside" ? 385 : 405)}`,
          }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.accentAlt}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          fill="none"
        />
      </g>
      <PersonGlyph x={learnerX} y={390} color={accent} />
      <circle data-learner="" cx={learnerX} cy={376} r={7} fill={accent} />
      <g data-locker-hand="">
        <SketchedShape
          shape={{
            kind: "line",
            x1: learnerX,
            y1: 390,
            x2: mix(touch, learnerX + 12, 345 + doorWidth - 8),
            y2: mix(touch, 402, 305),
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
      <PracticeStrip input={input} learnerX={learnerX} accent={accent} />
    </g>
  );
}
