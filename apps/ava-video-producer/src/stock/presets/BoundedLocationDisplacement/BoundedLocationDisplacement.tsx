import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LocalDisplacementMap } from "./LocalDisplacementMap";
import { PublicDisplacementMap } from "./PublicDisplacementMap";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./BoundedLocationDisplacement.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Separate local offset computation and deliberately approximate disclosure.
 */
export function BoundedLocationDisplacement({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LocalDisplacementMap input={input} frame={frame} accent={accent} />
      <PublicDisplacementMap input={input} frame={frame} accent={accent} />
      <LabelSlots
        labels={[
          [input.copy.context, 40, 30, 880, 16, 2],
          [input.labels.source, 40, 82, 400, 12, 2],
          [input.labels.display, 485, 82, 430, 12, 2],
          [input.copy.before, 40, 128, 400, 12, 3],
          [input.copy.after, 485, 128, 430, 12, 3],
          [input.labels.bound, 40, 450, 400, 12, 2],
        ]}
      />
      {input.locations.map((location, index) => (
        <LabelSlots
          key={location.id}
          labels={[
            [
              `${index + 1}· ${Math.hypot(location.offsetX, location.offsetY)} ≤ ${input.radiusUnits}`,
              40,
              490 + index * 38,
              400,
              12,
              2,
            ],
          ]}
        />
      ))}
    </g>
  );
}
