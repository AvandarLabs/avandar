import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./PublicWorksMeasurementCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * Supplied labels retain one unit and the signed observed-minus-promised value.
 */
export function MeasurementCaptions({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const difference = Number(
    (input.observation.length - input.specification.length).toPrecision(12),
  );
  return (
    <g>
      <LabelSlots
        labels={[
          [input.labels.example, 48, 40, 864, 16, 2],
          [input.labels.specification, 48, 80, 410, 16, 3],
          [input.specification.label, 48, 145, 410, 16, 3],
          [String(input.specification.length), 48, 219, 410, 20, 1],
          [input.specification.unit, 48, 245, 410, 14, 3],
          [input.labels.observation, 505, 80, 410, 16, 3],
          [input.observation.label, 505, 145, 410, 16, 3],
          [String(input.observation.length), 505, 219, 410, 20, 1],
          [input.observation.sourceLabel, 505, 245, 410, 12, 2],
          [input.observers[0].label, 100, 485, 335, 14, 3],
          [input.observers[1].label, 550, 485, 335, 14, 3],
        ]}
      />
      {input.showDifference ? (
        <g opacity={ramp(frame, 108, 12)}>
          <LabelSlots
            labels={[
              [input.labels.difference, 48, 556, 410, 14, 3],
              [
                `${difference > 0 ? "+" : ""}${difference} ${input.specification.unit}`,
                505,
                556,
                410,
                14,
                3,
              ],
            ]}
          />
        </g>
      ) : undefined}
    </g>
  );
}
