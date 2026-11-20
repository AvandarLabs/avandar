import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PossibilityMark } from "./PossibilityMark";
import type { Input } from "../LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; focus: { possible: number[] } };
/** Possible districts lift beside the focused uncertainty footprint. */
export function DistrictLabels({
  input,
  frame,
  focus,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      {input.districts.map((district, index) => {
        // At most four district indices are tested. The bounded
        // lookup benchmark including Set construction favors array
        // scanning.
        // react-doctor-disable-next-line js-set-map-lookups
        const isPossible = focus.possible.includes(index);
        return (
          <g
            key={district.id}
            data-possible-district={isPossible ? district.id : undefined}
            transform={`translate(0 ${isPossible ? -8 * motion.ramp(frame, 60, motion.scale(36)) : 0})`}
          >
            <PossibilityMark
              districtId={district.id}
              index={index}
              isPossible={isPossible}
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
