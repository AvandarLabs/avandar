import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** The completed fold states the count or exact numeric calculation. */
export function PickerFormula({ input, frame }: Readonly<Props>): ReactNode {
  const numeric = input.observations.flatMap(({ value }) =>
    value === null ? [] : [value],
  );
  const formula =
    input.rule === "mean"
      ? `(${numeric.join(" + ")}) ÷ ${numeric.length}`
      : input.rule === "count"
        ? numeric.map(() => "1").join(" + ")
        : input.rule === "sum"
          ? numeric.join(" + ")
          : input.rule === "first"
            ? "①"
            : `${input.rule}(${numeric.join(", ")})`;
  return (
    <g opacity={ramp(frame, 100, 5)}>
      <LabelSlots labels={[[formula, 60, 440, 535, 12, 6]]} />
    </g>
  );
}
