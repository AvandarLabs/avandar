import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./SharedWorkshopBooking.schema";
import type { ReactNode } from "react";
/** Inputs for WorkshopTimeRuler. */
type Props = { input: Input };

/** Discrete equal-width authored slots do not infer duration. */
export function WorkshopTimeRuler({ input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const slotWidth = 540 / input.timeSlots.length;
  return (
    <g>
      {" "}
      {input.timeSlots.map((slot, index) => {
        return (
          <g key={slot.id}>
            <SketchedShape
              shape={{
                kind: "path",
                d: `M${390 + index * slotWidth} 490 V500 H${390 + (index + 1) * slotWidth} V490`,
              }}
              profile={tokens.sketch.shape}
              fill="none"
              stroke={tokens.color.inactive}
            />
            <LabelSlots
              labels={[
                [
                  slot.label,
                  395 + index * slotWidth,
                  515,
                  slotWidth - 15,
                  12,
                  5,
                ],
              ]}
            />
          </g>
        );
      })}
    </g>
  );
}
