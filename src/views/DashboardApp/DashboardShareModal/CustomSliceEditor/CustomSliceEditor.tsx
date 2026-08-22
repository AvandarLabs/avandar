import { Stack } from "@mantine/core";
import { ColumnPicker } from "@/views/DashboardApp/DashboardShareModal/CustomSliceEditor/ColumnPicker";
import { RowFilterEditor } from "@/views/DashboardApp/DashboardShareModal/CustomSliceEditor/RowFilterEditor";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type {
  FilterableColumn,
  PublishSliceDataset,
} from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection/PublishSliceSection.types";
import type { ReactNode } from "react";

type Props = {
  dataset: PublishSliceDataset;
  slice: Extract<PublishSliceConfig.T, { mode: "custom" }>;
  onChange: (slice: PublishSliceConfig.T) => void;
};

/** Edits columns and row filters for a custom publication slice. */
export function CustomSliceEditor({
  dataset,
  slice,
  onChange,
}: Readonly<Props>): ReactNode {
  const filterableColumns: FilterableColumn[] = dataset.columns.map(
    (column) => {
      return { name: column.name, type: column.dataType };
    },
  );
  const selectedColumnNames = new Set(slice.columns);
  const queriedColumnNames = new Set(dataset.queriedColumns);
  const setColumns = (columns: readonly string[]): void => {
    onChange({ ...slice, columns: [...columns] });
  };
  const setRowFilters = (
    rowFilters: readonly PublishSliceConfig.RowFilter[],
  ): void => {
    onChange({ ...slice, rowFilters: [...rowFilters] });
  };

  return (
    <Stack gap="md">
      <ColumnPicker
        dataset={dataset}
        queriedColumnNames={queriedColumnNames}
        selectedColumnNames={selectedColumnNames}
        setColumns={setColumns}
        slice={slice}
      />
      <RowFilterEditor
        filterableColumns={filterableColumns}
        rowFilters={slice.rowFilters}
        setRowFilters={setRowFilters}
      />
    </Stack>
  );
}
