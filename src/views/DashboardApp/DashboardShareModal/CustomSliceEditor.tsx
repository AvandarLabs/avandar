import { prop, propEq } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import {
  Badge,
  Button,
  Checkbox,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { AddRowFilterMenu } from "@/views/DashboardApp/DashboardShareModal/AddRowFilterMenu";
import { PublishSliceRowFilter } from "@/views/DashboardApp/DashboardShareModal/PublishSliceRowFilter";
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

type RenderColumnCheckboxOptions = {
  column: PublishSliceDataset["columns"][number];
  isQueried: boolean;
  isSelected: boolean;
  selectedColumns: readonly string[];
  setColumns: (columns: readonly string[]) => void;
};

type RenderColumnPickerOptions = {
  dataset: PublishSliceDataset;
  queriedColumnNames: ReadonlySet<string>;
  selectedColumnNames: ReadonlySet<string>;
  setColumns: (columns: readonly string[]) => void;
  slice: Extract<PublishSliceConfig.T, { mode: "custom" }>;
};

type RenderRowFilterOptions = {
  filterableColumns: readonly FilterableColumn[];
  rowFilter: PublishSliceConfig.RowFilter;
  rowFilterIndex: number;
  rowFilters: readonly PublishSliceConfig.RowFilter[];
  setRowFilters: (filters: readonly PublishSliceConfig.RowFilter[]) => void;
};

function _renderColumnCheckbox(
  options: Readonly<RenderColumnCheckboxOptions>,
): ReactNode {
  return (
    <Checkbox
      key={options.column.id}
      label={
        <Group gap={6}>
          <Text size="sm">{options.column.name}</Text>
          <Badge size="xs" variant="outline" color="neutral">
            {options.column.dataType}
          </Badge>
          {options.isQueried ?
            <Badge size="xs" variant="light" color="teal">
              <Trans>queried</Trans>
            </Badge>
          : null}
        </Group>
      }
      checked={options.isSelected}
      onChange={(event) => {
        const columnNames = new Set(options.selectedColumns);
        if (event.currentTarget.checked) {
          columnNames.add(options.column.name);
        } else {
          columnNames.delete(options.column.name);
        }
        options.setColumns(Array.from(columnNames));
      }}
    />
  );
}

function _renderColumnPickerHeader(
  options: Readonly<{
    dataset: PublishSliceDataset;
    setColumns: (columns: readonly string[]) => void;
  }>,
): ReactNode {
  return (
    <Group justify="space-between" align="end">
      <Text size="sm" fw={500}>
        <Trans>Columns</Trans>
      </Text>
      <Group gap="xs">
        <Button
          size="compact-xs"
          variant="subtle"
          onClick={() => {
            return options.setColumns(
              options.dataset.columns.map(prop("name")),
            );
          }}
        >
          <Trans>Select all</Trans>
        </Button>
        <Button
          size="compact-xs"
          variant="subtle"
          onClick={() => {
            return options.setColumns([...options.dataset.queriedColumns]);
          }}
          disabled={options.dataset.queriedColumns.length === 0}
        >
          <Trans>Just what's queried</Trans>
        </Button>
      </Group>
    </Group>
  );
}

function _renderColumnPicker(
  options: Readonly<RenderColumnPickerOptions>,
): ReactNode {
  return (
    <Stack gap={6}>
      {_renderColumnPickerHeader(options)}
      <ScrollArea.Autosize mah={200}>
        <Stack gap={2}>
          {options.dataset.columns.map((column) => {
            return _renderColumnCheckbox({
              column,
              isQueried: options.queriedColumnNames.has(column.name),
              isSelected: options.selectedColumnNames.has(column.name),
              selectedColumns: options.slice.columns,
              setColumns: options.setColumns,
            });
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}

function _renderRowFilter(
  options: Readonly<RenderRowFilterOptions>,
): ReactNode {
  const { rowFilter } = options;
  return (
    <PublishSliceRowFilter
      key={rowFilter.id ?? `${rowFilter.columnName}-${rowFilter.kind}`}
      rowFilter={rowFilter}
      columnType={
        options.filterableColumns.find(propEq("name", rowFilter.columnName))
          ?.type ?? "varchar"
      }
      onChange={(updatedRowFilter) => {
        const rowFilters = options.rowFilters.slice();
        rowFilters[options.rowFilterIndex] = updatedRowFilter;
        options.setRowFilters(rowFilters);
      }}
      onRemove={() => {
        options.setRowFilters(
          options.rowFilters.filter((_, index) => {
            return index !== options.rowFilterIndex;
          }),
        );
      }}
    />
  );
}

function _renderRowFilterEditor(
  options: Readonly<{
    filterableColumns: readonly FilterableColumn[];
    rowFilters: readonly PublishSliceConfig.RowFilter[];
    setRowFilters: (filters: readonly PublishSliceConfig.RowFilter[]) => void;
  }>,
): ReactNode {
  return (
    <Stack gap={6}>
      <Group justify="space-between" align="end">
        <Text size="sm" fw={500}>
          <Trans>Row filters</Trans>
        </Text>
        <AddRowFilterMenu
          columns={options.filterableColumns}
          onAdd={(rowFilter) => {
            return options.setRowFilters([...options.rowFilters, rowFilter]);
          }}
        />
      </Group>
      {options.rowFilters.length === 0 ?
        <Text size="xs" c="dimmed">
          <Trans>
            No row filters. The slice will include every row in the dataset (for
            the selected columns).
          </Trans>
        </Text>
      : <Stack gap="xs">
          {options.rowFilters.map((rowFilter, rowFilterIndex) => {
            return _renderRowFilter({
              filterableColumns: options.filterableColumns,
              rowFilter,
              rowFilterIndex,
              rowFilters: options.rowFilters,
              setRowFilters: options.setRowFilters,
            });
          })}
        </Stack>
      }
    </Stack>
  );
}

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
      {_renderColumnPicker({
        dataset,
        queriedColumnNames,
        selectedColumnNames,
        setColumns,
        slice,
      })}
      {_renderRowFilterEditor({
        filterableColumns,
        rowFilters: slice.rowFilters,
        setRowFilters,
      })}
    </Stack>
  );
}
