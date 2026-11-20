import { mix } from "../../../../motion";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PracticeStrip } from "../PracticeStrip";
import { SupportGesture } from "./SupportGesture";
import type { getRehearsalFromFrame } from "../getRehearsalFromFrame";
import type { Input } from "../SchoolTransitionRehearsal.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
      <SupportGesture
        support={input.finalStepSupport}
        companionX={companionX}
        finalStep={finalStep}
      />
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
