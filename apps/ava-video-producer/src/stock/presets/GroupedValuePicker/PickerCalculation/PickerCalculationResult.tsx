import { PickerFormula } from "../PickerFormula";
import { PickerModeGroups } from "../PickerModeGroups";
import { PickerValueCopy } from "../PickerValueCopy";
import type { getPickerGroupsFromInput } from "../getPickerGroupsFromInput";
import type { Input } from "../GroupedValuePicker.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  groups: ReturnType<typeof getPickerGroupsFromInput>;
  isMode: boolean;
};

/** Renders the picker calculation result in authored paint order. */
export function PickerCalculationResult(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.isMode ? (
        <PickerModeGroups
          input={options.input}
          groups={options.groups}
          frame={options.frame}
          accent={options.accent}
        />
      ) : (
        <PickerFormula input={options.input} frame={options.frame} />
      )}
      {options.frame >= 56
        ? options.input.observations.map((observation, index) => {
            return (
              <PickerValueCopy
                key={observation.id}
                input={options.input}
                index={index}
                frame={options.frame}
                accent={options.accent}
                groups={options.groups}
              />
            );
          })
        : null}
    </>
  );
}
