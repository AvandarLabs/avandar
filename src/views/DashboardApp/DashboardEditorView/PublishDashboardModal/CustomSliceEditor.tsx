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
import { prop } from "@utils";
import { AddRowFilterMenu } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/AddRowFilterMenu";
import { PublishSliceRowFilter } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishSliceRowFilter";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type {
  FilterableColumn,
  PublishSliceDataset,
} from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishSliceSection.types";
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
}: Props): ReactNode {
  const allColumnNames = dataset.columns.map(prop("name"));
  const filterableColumns: readonly FilterableColumn[] = dataset.columns.map(
    (column) => {
      return { name: column.name, type: column.dataType };
    },
  );
  const selectedColumnNames = new Set(slice.columns);
  const queriedColumnNames = new Set(dataset.queriedColumns);
  const setColumns = (columns: readonly string[]): void => {
    onChange({ ...slice, columns });
  };
  const setRowFilters = (
    rowFilters: readonly PublishSliceConfig.RowFilter[],
  ): void => {
    onChange({ ...slice, rowFilters });
  };

  return (
    <Stack gap="md">
      <Stack gap={6}>
        <Group justify="space-between" align="end">
          <Text size="sm" fw={500}>
            <Trans>Columns</Trans>
          </Text>
          <Group gap="xs">
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => {
                setColumns(allColumnNames);
              }}
            >
              <Trans>Select all</Trans>
            </Button>
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => {
                setColumns(dataset.queriedColumns);
              }}
              disabled={dataset.queriedColumns.length === 0}
            >
              <Trans>Just what's queried</Trans>
            </Button>
          </Group>
        </Group>
        <ScrollArea.Autosize mah={200}>
          <Stack gap={2}>
            {dataset.columns.map((column) => {
              const isQueried = queriedColumnNames.has(column.name);
              return (
                <Checkbox
                  key={column.id}
                  label={
                    <Group gap={6}>
                      <Text size="sm">{column.name}</Text>
                      <Badge size="xs" variant="outline" color="neutral">
                        {column.dataType}
                      </Badge>
                      {isQueried ?
                        <Badge size="xs" variant="light" color="teal">
                          <Trans>queried</Trans>
                        </Badge>
                      : null}
                    </Group>
                  }
                  checked={selectedColumnNames.has(column.name)}
                  onChange={(event) => {
                    const columnNames = new Set(slice.columns);
                    if (event.currentTarget.checked) {
                      columnNames.add(column.name);
                    } else {
                      columnNames.delete(column.name);
                    }
                    setColumns(Array.from(columnNames));
                  }}
                />
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
      <Stack gap={6}>
        <Group justify="space-between" align="end">
          <Text size="sm" fw={500}>
            <Trans>Row filters</Trans>
          </Text>
          <AddRowFilterMenu
            columns={filterableColumns}
            onAdd={(rowFilter) => {
              setRowFilters([...slice.rowFilters, rowFilter]);
            }}
          />
        </Group>
        {slice.rowFilters.length === 0 ?
          <Text size="xs" c="dimmed">
            <Trans>
              No row filters. The slice will include every row in the dataset
              (for the selected columns).
            </Trans>
          </Text>
        : <Stack gap="xs">
            {slice.rowFilters.map((rowFilter, rowFilterIndex) => {
              return (
                <PublishSliceRowFilter
                  key={
                    rowFilter.id ?? `${rowFilter.columnName}-${rowFilter.kind}`
                  }
                  rowFilter={rowFilter}
                  columnType={
                    filterableColumns.find((column) => {
                      return column.name === rowFilter.columnName;
                    })?.type ?? "varchar"
                  }
                  onChange={(updatedRowFilter) => {
                    const rowFilters = slice.rowFilters.slice();
                    rowFilters[rowFilterIndex] = updatedRowFilter;
                    setRowFilters(rowFilters);
                  }}
                  onRemove={() => {
                    setRowFilters(
                      slice.rowFilters.filter((_, filterIndex) => {
                        return filterIndex !== rowFilterIndex;
                      }),
                    );
                  }}
                />
              );
            })}
          </Stack>
        }
      </Stack>
    </Stack>
  );
}
