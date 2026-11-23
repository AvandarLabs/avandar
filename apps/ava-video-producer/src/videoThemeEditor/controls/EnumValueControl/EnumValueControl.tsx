import { prop } from "@avandar/utils";
import { SegmentedControl } from "@mantine/core";
import { useRowHasIssue } from "../../RowIssueContext/RowIssueContext";
import { EditorCopy } from "../../tokenCopy/EditorCopy";
import { ControlValues } from "../ControlValues/ControlValues";
import { EnumMenu } from "./EnumMenu/EnumMenu";
import type { ValueControlProps } from "../valueControl.types";
import type { ReactNode } from "react";

type Props = ValueControlProps;
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
}: Readonly<Props>): ReactNode {
  const hasIssue = useRowHasIssue();
  const options = (definition.options ?? []).map((option) => {
    return {
      option,
      ...EditorCopy.getOptionCopy({ key: optionKey, option }),
    };
  });
  const selection = ControlValues.getEnumSelection({
    value,
    options: options.map(prop("option")),
  });
  return options.length > 3 ? (
    <EnumMenu
      label={label}
      value={selection}
      options={options}
      hasIssue={hasIssue}
      onChange={onChange}
    />
  ) : (
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
