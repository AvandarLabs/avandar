import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { Input } from "../EntitySpineAssembly.schema";
import type { ReactNode } from "react";

type Props = {
  value: number | null;
  attachment: ReturnType<typeof Motion.ramp>;
  frame: number;
  input: Input;
  y: number;
};

/** Renders the labels with authored geometry. */
export function EntitySpineRowLabels({
  value,
  attachment,
  frame,
  input,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={value === null ? attachment : frame >= 139 ? 1 : 0}
      transform={`translate(${
        value === null ? Motion.mix({ t: attachment, from: 30, to: 0 }) : 0
      } 0)`}
    >
      <LabelSlots
        labels={[
          [
            value === null ? input.field.missingLabel : String(value),
            690,
            y + 18,
            195,
            14,
            4,
          ],
        ]}
      />
    </g>
  );
}
