import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { EntitySpineAssembly } from "../EntitySpineAssembly";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof EntitySpineAssembly>[0]["input"];
  frame: Parameters<typeof EntitySpineAssembly>[0]["frame"];
};

/** Renders the labels with authored geometry. */
export function EntitySpineAssemblyLabels({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [input.copy.context, 50, 580, 850, 14, 1],
        [
          frame >= 140 ? input.copy.after : input.copy.before,
          50,
          30,
          850,
          14,
          1,
        ],
        [input.field.label, 460, 62, 440, 16, 2],
        [input.field.unit, 460, 102, 440, 12, 1],
      ]}
    />
  );
}
