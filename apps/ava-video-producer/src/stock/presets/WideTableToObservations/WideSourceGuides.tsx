import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./WideTableToObservations.schema";
import type { ReactNode } from "react";
/** Inputs for WideSourceGuides. */
type Props = { input: Input; frame: number };
/** Original wide table retains subject, measurement and unit headings. */
export function WideSourceGuides({ input, frame }: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g opacity={1 - motion.ramp(frame, 51, motion.scale(53))}>
      {input.measures.map((measure, index) => {
        return (
          <LabelSlots
            key={measure.id}
            labels={[
              [measure.label, 360 + index * 280, 132, 244, 12, 2],
              [measure.unit, 360 + index * 280, 165, 244, 12, 2],
            ]}
          />
        );
      })}
      {input.subjects.map((subject, index) => {
        return (
          <LabelSlots
            key={subject.id}
            labels={[[subject.label, 52, 213 + index * 112, 264, 16, 3]]}
          />
        );
      })}
    </g>
  );
}
