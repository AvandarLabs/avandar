import { mix } from "../../../motion";
import { Text } from "../../graphics-common/Text";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./StratifiedSpatialSample.schema";
import type { ReactNode } from "react";

/** How long each aggregate quantity counts up from zero. */
const COUNT_FRAMES = 28;
type Props = { input: Input; frame: number };
/** Captions and aggregate quantities retain the eligible sampling frame. */
export function SampleCopy({ input, frame }: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
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
        (quantity, index) => {
          const countAt = 108 + index * motion.stagger.list;
          const count = motion.ramp(
            frame,
            countAt,
            motion.scale(COUNT_FRAMES),
            motion.entrance.easing,
          );
          return (
            <g
              key={index}
              opacity={motion.ramp(
                frame,
                countAt,
                motion.panel,
                motion.reveal.easing,
              )}
            >
              <Text x={40 + index * 310} y={552} role="question">
                {Math.round(mix(count, 0, quantity))}
              </Text>
            </g>
          );
        },
      )}
    </g>
  );
}
