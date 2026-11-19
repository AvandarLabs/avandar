import { Switch } from "@mantine/core";
import css from "./UsageFilter.module.css";
import type { EditorFilters } from "../EditorToolbar";
import type { ReactNode } from "react";

type Props = Readonly<{
  filters: EditorFilters;
  onFiltersChange: (filters: EditorFilters) => void;
}>;

/**
 * The switch that limits the rows to settings the preview has used, with a
 * hint.
 */
export function UsageFilter({ filters, onFiltersChange }: Props): ReactNode {
  return (
    <div className={css.usageFilter}>
      <Switch
        size="xs"
        label="Only settings used by this preview"
        checked={filters.isUsedOnly}
        onChange={(event) => {
          return onFiltersChange({
            ...filters,
            isUsedOnly: event.currentTarget.checked,
          });
        }}
      />
      {filters.isUsedOnly ? (
        <p className={css.usageFilterHint}>
          {
            "Shows what the preview has used so far. Play it once to find the rest."
          }
        </p>
      ) : null}
    </div>
  );
}
