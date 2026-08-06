import { useLingui } from "@lingui/react/macro";
import { MultiSelect, TextInput } from "@mantine/core";
import { Select } from "@ui";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type {
  LocalFilter,
  LocalFilterValue,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";
import type { ReactNode } from "react";

type Props = {
  filter: LocalFilter;
  value: LocalFilterValue;
  onChange: (value: LocalFilterValue) => void;
};

/** Renders the input associated with one visualization-local filter. */
export function DataVizLocalFilterInput({
  filter,
  value,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const filterOptions = DataVizFilters.parseLocalFilterOptions(
    filter.optionsRaw,
  );
  if (filter.mode === "select_multi") {
    return (
      <MultiSelect
        miw={180}
        size="xs"
        label={filter.label}
        placeholder={t`All`}
        data={filterOptions}
        clearable
        searchable
        value={[...((value as readonly string[]) ?? [])]}
        onChange={onChange}
      />
    );
  }
  if (filter.mode === "contains") {
    return (
      <TextInput
        miw={180}
        size="xs"
        label={filter.label}
        placeholder={t`Contains…`}
        value={(value as string) ?? ""}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
      />
    );
  }
  return (
    <Select
      miw={180}
      size="xs"
      label={filter.label}
      placeholder={t`All`}
      data={filterOptions}
      clearable
      searchable
      value={(value as string) ?? null}
      onChange={(selectedValue) => {
        onChange(selectedValue ?? undefined);
      }}
    />
  );
}
