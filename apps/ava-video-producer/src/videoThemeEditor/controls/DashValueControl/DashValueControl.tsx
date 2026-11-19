import { TextInput } from "@mantine/core";
import { useRowHasIssue } from "../../RowIssueContext/RowIssueContext";
import {
  formatDashPattern,
  parseDashDraft,
} from "../controlValueHelpers/controlValueHelpers";
import { useDraftValue } from "../useDraftValue";
import { DashPresets } from "./DashPresets";
import { DashPreview } from "./DashPreview/DashPreview";
import css from "./DashValueControl.module.css";
import type { ValueControlProps } from "../valueControl.types";
import type { ReactNode } from "react";

/**
 * A dash pattern: presets plus exact dash and gap lengths, previewed as a line.
 */
export function DashValueControl({
  label,
  value,
  onChange,
}: ValueControlProps): ReactNode {
  const hasIssue = useRowHasIssue();
  const pattern: readonly number[] =
    Array.isArray(value) &&
    value.every((dash) => {
      return typeof dash === "number";
    })
      ? value
      : [];
  const field = useDraftValue<readonly number[], string>({
    value: pattern,
    toKey: formatDashPattern,
    toDraft: formatDashPattern,
    parse: parseDashDraft,
    onChange,
  });
  return (
    <div className={css.dashValueStack} role="group" aria-label={label}>
      <DashPresets pattern={pattern} onChange={onChange} />
      <TextInput
        size="xs"
        label="Dash and gap lengths"
        value={field.draft}
        error={
          field.isValid
            ? hasIssue
            : "Use up to eight numbers separated by spaces."
        }
        onChange={(event) => {
          return field.change(event.currentTarget.value);
        }}
      />
      <DashPreview pattern={pattern} />
    </div>
  );
}
