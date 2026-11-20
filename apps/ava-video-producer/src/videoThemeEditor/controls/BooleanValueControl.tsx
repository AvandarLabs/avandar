import { Switch } from "@mantine/core";
import {
  useRowHasIssue,
  useRowIssueAriaProps,
} from "../RowIssueContext/RowIssueContext";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

/** A switch token. */
export function BooleanValueControl({
  label,
  value,
  onChange,
}: ValueControlProps): ReactNode {
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
