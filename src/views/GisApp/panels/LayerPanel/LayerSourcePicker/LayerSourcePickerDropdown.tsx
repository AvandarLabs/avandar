import { useLingui } from "@lingui/react/macro";
import { Popover } from "@mantine/core";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { ReactNode } from "react";

type Props = { onSourceSelected: (source: QueryDataSource.T) => void };

/** Searches and selects the source for a new layer. */
export function LayerSourcePickerDropdown({
  onSourceSelected,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Popover.Dropdown p="xs">
      <QueryDataSourceSelect
        label={t`Data source`}
        placeholder={t`Search data sources`}
        searchable
        comboboxProps={{ withinPortal: false }}
        value={null}
        onChange={(dataSource) => {
          if (dataSource) {
            onSourceSelected(dataSource);
          }
        }}
      />
    </Popover.Dropdown>
  );
}
