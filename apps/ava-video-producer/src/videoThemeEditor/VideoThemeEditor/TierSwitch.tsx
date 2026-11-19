import { SegmentedControl } from "@mantine/core";
import type { EditorFilters } from "./EditorToolbar/EditorToolbar";

type Props = Readonly<{
  filters: EditorFilters;
  onFiltersChange: (filters: EditorFilters) => void;
}>;

/** The tabs that choose which tier of settings the editor lists. */
export function TierSwitch({ filters, onFiltersChange }: Props) {
  return (
    <SegmentedControl
      size="xs"
      fullWidth
      aria-label="Kind of setting"
      value={filters.tier}
      data={[
        {
          value: "component",
          label: "Parts",
        },
        { value: "semantic", label: "Styles" },
        { value: "atomic", label: "Base values" },
      ]}
      onChange={(tier) => {
        return onFiltersChange({ ...filters, tier });
      }}
    />
  );
}
