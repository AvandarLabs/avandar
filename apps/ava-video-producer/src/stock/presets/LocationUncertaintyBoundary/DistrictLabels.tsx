import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; focus: { possible: number[] } };
/** Possible districts lift beside the focused uncertainty footprint. */
export function DistrictLabels({
  input,
  frame,
  focus,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.districts.map((district, index) => (
        <g
          key={district.id}
          data-possible-district={
            focus.possible.includes(index) ? district.id : undefined
          }
          transform={`translate(0 ${focus.possible.includes(index) ? -8 * ramp(frame, 60, 36) : 0})`}
        >
          <path
            data-possibility={district.id}
            data-is-possible={focus.possible.includes(index)}
            d={
              focus.possible.includes(index)
                ? `M918 ${124 + index * 40}l4 4 8-10`
                : `M918 ${124 + index * 40}h12`
            }
            fill="none"
            stroke={focus.possible.includes(index) ? STOCK.mint : STOCK.muted}
            strokeWidth={2}
          />
          <LabelSlots
            labels={[
              [String(index + 1), 480, 132 + index * 40, 24, 12, 1],
              [district.label, 520, 132 + index * 40, 380, 14, 2],
            ]}
          />
        </g>
      ))}
    </g>
  );
}
