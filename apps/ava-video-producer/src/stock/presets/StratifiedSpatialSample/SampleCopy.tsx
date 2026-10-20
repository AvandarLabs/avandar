import { countTo, ramp, STAGGER } from "../../../motion";
import { Text } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./StratifiedSpatialSample.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** Captions and aggregate quantities retain the eligible sampling frame. */
export function SampleCopy({ input, frame }: Readonly<Props>): ReactNode {
  const selectedCount = input.selectedSiteIds.length;
  const eligibleCount = input.sites.length;
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 40, 36, 880, 18, 2],
          [input.copy.selected, 40, 490, 290, 12, 3],
          [input.copy.eligible, 350, 490, 290, 12, 3],
          [input.copy.unsampled, 660, 490, 290, 12, 3],
          [input.copy.unit, 40, 578, 880, 12, 1],
        ]}
      />
      {[selectedCount, eligibleCount, eligibleCount - selectedCount].map(
        (quantity, index) => (
          <g key={index} opacity={ramp(frame, 108 + index * STAGGER)}>
            <Text x={40 + index * 310} y={552} size={24}>
              {countTo(frame, 108 + index * STAGGER, quantity, 28)}
            </Text>
          </g>
        ),
      )}
    </g>
  );
}
