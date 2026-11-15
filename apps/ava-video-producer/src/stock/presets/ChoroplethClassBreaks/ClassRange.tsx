import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { ReactNode } from "react";

type Props = {
  lower: number;
  upper: number;
  y: number;
  color: string;
  isFinal: boolean;
};
/** A colored range has an explicit final-inclusive endpoint. */
export function ClassRange({
  lower,
  upper,
  y,
  color,
  isFinal,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect x={554} y={y - 10} width={10} height={10} fill={color} />
      <LabelSlots
        labels={[
          [`[${lower}, ${upper}${isFinal ? "]" : ")"}`, 574, y, 326, 12, 2],
        ]}
      />
    </g>
  );
}
