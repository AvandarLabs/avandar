import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type {
  GroupedValuePicker,
  GroupedValuePickerGetSelectLabelCallable,
} from "../GroupedValuePicker";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof GroupedValuePicker>[0]["input"];
  _getSelectLabel: GroupedValuePickerGetSelectLabelCallable;
};

/** Renders the labels with authored geometry. */
export function GroupedValuePickerLabels({
  input,
  _getSelectLabel,
}: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [input.labels.entity, 48, 35, 864, 18, 1],
        [input.labels.field, 48, 80, 864, 16, 1],
        [
          _getSelectLabel({ path: "rule", value: input.rule }),
          48,
          120,
          390,
          14,
          2,
        ],
        [
          _getSelectLabel({ path: "nullPolicy", value: input.nullPolicy }),
          490,
          120,
          422,
          14,
          2,
        ],
      ]}
    />
  );
}
