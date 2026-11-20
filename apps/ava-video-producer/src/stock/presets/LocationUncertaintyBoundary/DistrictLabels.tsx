import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; focus: { possible: number[] } };
/** Possible districts lift beside the focused uncertainty footprint. */
export function DistrictLabels({
  input,
  frame,
  focus,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g>
      {input.districts.map((district, index) => {
        return (
          <g
            key={district.id}
            data-possible-district={
              focus.possible.includes(index) ? district.id : undefined
            }
            transform={`translate(0 ${focus.possible.includes(index) ? -8 * motion.ramp(frame, 60, motion.scale(36)) : 0})`}
          >
            <PossibilityMark
              districtId={district.id}
              index={index}
              isPossible={focus.possible.includes(index)}
            />
            <LabelSlots
              labels={[
                [String(index + 1), 480, 132 + index * 40, 24, 12, 1],
                [district.label, 520, 132 + index * 40, 380, 14, 2],
              ]}
            />
          </g>
        );
      })}
    </g>
  );
}

/** A tick for a possible district, a dash for one ruled out. */
function PossibilityMark({
  districtId,
  index,
  isPossible,
}: Readonly<{
  districtId: string;
  index: number;
  isPossible: boolean;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: isPossible
          ? `M918 ${124 + index * 40}l4 4 8-10`
          : `M918 ${124 + index * 40}h12`,
      }}
      profile={tokens.sketch.shape}
      data-possibility={districtId}
      data-is-possible={isPossible}
      fill="none"
      stroke={isPossible ? tokens.color.positive : tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}
