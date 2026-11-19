import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ApproachTrait } from "./ApproachTrait";
import type { Input } from "./SharedFoundation.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  approach: Input["approaches"][number];
  index: number;
  showTrait: boolean;
};
/**
 * Each distinct identity lifts independently while keeping its authored trait.
 */
export function FoundationApproach({
  frame,
  accent,
  approach,
  index,
  showTrait,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const x = 80 + index * 440;
  const lift = motion.ramp(frame, 36, motion.scale(36), motion.travel.easing);
  const arrival = motion.ramp(frame, 12 + index * 6, motion.hero);
  return (
    <g
      data-approach={approach.id}
      opacity={arrival}
      transform={`translate(0 ${mix(lift, 0, -40) + mix(arrival, 12, 0)})`}
    >
      <SketchedShape
        shape={{ kind: "path", d: `M${x} 370 V180 H${x + 360} V370 Z` }}
        profile={tokens.sketch.shape}
        stroke={index ? tokens.color.positive : accent}
        fill={tokens.color.surface}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <FitText
        text={approach.label}
        x={x + 180}
        y={220}
        width={320}
        fontSize={20}
        maxLines={3}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      <ApproachTrait {...{ frame, approach, index, x, showTrait }} />
    </g>
  );
}
