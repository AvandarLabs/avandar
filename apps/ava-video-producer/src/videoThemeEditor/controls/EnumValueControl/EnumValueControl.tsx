import { SegmentedControl } from "@mantine/core";
import { useRowHasIssue } from "../../RowIssueContext/RowIssueContext";
import { getOptionCopy } from "../../tokenCopy/editorCopy";
import { getEnumSelection } from "../controlValueHelpers/controlValueHelpers";
import { EnumMenu } from "./EnumMenu/EnumMenu";
import type { ValueControlProps } from "../valueControl.types";
import type { ReactNode } from "react";

/**
 * An enum token: segments for up to three options, otherwise a menu with
 * explanations.
 */
export function EnumValueControl({
  label,
  definition,
  value,
  onChange,
  optionKey = "",
}: ValueControlProps): ReactNode {
  const hasIssue = useRowHasIssue();
  const options = (definition.options ?? []).map((option) => {
    return {
      option,
      ...getOptionCopy({ key: optionKey, option }),
    };
  });
  const selection = getEnumSelection(
    value,
    options.map((entry) => {
      return entry.option;
    }),
  );
  if (options.length > 3) {
    return (
      <EnumMenu
        label={label}
        value={selection}
        options={options}
        hasIssue={hasIssue}
        onChange={onChange}
      />
    );
  }
  return (
    <SegmentedControl
      size="xs"
      fullWidth
      aria-label={label}
      aria-invalid={hasIssue || undefined}
      value={selection ?? ""}
      data={options.map((entry) => {
        return {
          value: entry.option,
          label: entry.label,
        };
      })}
      onChange={onChange}
    />
  );
}
