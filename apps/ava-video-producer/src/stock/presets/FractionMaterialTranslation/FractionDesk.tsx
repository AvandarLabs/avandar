import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FractionLearner } from "./FractionLearner";
import { FractionMaterialLabels } from "./FractionMaterialLabels/FractionMaterialLabels";
import { FractionSurface } from "./FractionSurface/FractionSurface";
import type { Input } from "./FractionMaterialTranslation.schema";
import type { ReactNode } from "react";

type Props = {
  representation: Input["representations"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
/** Distinct learners retain their own materials as the work surfaces align. */
export function FractionDesk({
  representation,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const initialX =
    input.representations.length === 2 ? 270 + index * 420 : 180 + index * 300;
  const finalX =
    input.representations.length === 2 ? 350 + index * 260 : 240 + index * 240;
  const comparison =
    input.resolvedArrangement === "shared-table"
      ? motion.ramp(frame, 88, motion.scale(20), motion.travel.easing)
      : 0;
  const x = Motion.mix({ t: comparison, from: initialX, to: finalX });
  const y = Motion.mix({ t: comparison, from: 330, to: 360 });
  return (
    <g>
      <FractionLearner
        {...{ input, representation, initialX, frame, accent }}
      />
      <FractionSurface {...{ input, representation, x, y, frame, accent }} />
      <FractionMaterialLabels {...{ representation, input, x }} />
    </g>
  );
}
