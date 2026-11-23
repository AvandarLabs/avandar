import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PlannerPeopleShared } from "./PlannerPeopleShared";
import type { ReactNode } from "react";

type Props = {
  agreement: Readonly<{ x: number; y: number }>;
  frame: number;
  accent: string;
};

/** The agreement check, drawing on beside the agreed appointment. */
export function AgreementMark({
  agreement,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-agreement-mark="">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${agreement.x - 4} ${agreement.y}l4 4 8-10`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        pathLength={PlannerPeopleShared.DRAW_ON_LENGTH}
        strokeDasharray={PlannerPeopleShared.DRAW_ON_LENGTH}
        strokeDashoffset={
          PlannerPeopleShared.DRAW_ON_LENGTH - motion.reveal(frame, 120)
        }
        opacity={motion.ramp(frame, 120, motion.scale(1), motion.reveal.easing)}
      />
    </g>
  );
}
