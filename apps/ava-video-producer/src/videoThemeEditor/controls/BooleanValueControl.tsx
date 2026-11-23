import { Switch } from "@mantine/core";
import { useRowHasIssue } from "../RowIssueContext/RowIssueContext";
import { useRowIssueAriaProps } from "../RowIssueContext/rowIssueHelpers";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

type Props = ValueControlProps;

/** A switch token. */
export function BooleanValueControl({
  label,
  value,
  onChange,
}: Readonly<Props>): ReactNode {
  const hasIssue = useRowHasIssue();
  const issueAriaProps = useRowIssueAriaProps();
  return (
    <Switch
      size="xs"
      aria-label={label}
      error={hasIssue}
      {...issueAriaProps}
      checked={value === true}
      onChange={(event) => {
        return onChange(event.currentTarget.checked);
      }}
    />
  );
}
