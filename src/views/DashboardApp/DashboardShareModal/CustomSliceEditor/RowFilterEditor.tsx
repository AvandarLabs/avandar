import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { FilterableColumn } from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection/PublishSliceSection.types";
import type { ReactNode } from "react";

import { propEq } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Group, Stack, Text } from "@mantine/core";

import { AddRowFilterMenu } from "@/views/DashboardApp/DashboardShareModal/AddRowFilterMenu";
import { PublishSliceRowFilter } from "@/views/DashboardApp/DashboardShareModal/PublishSliceRowFilter/PublishSliceRowFilter";

type Props = {
  filterableColumns: readonly FilterableColumn[];
  rowFilters: readonly PublishSliceConfig.RowFilter[];
  setRowFilters: (filters: readonly PublishSliceConfig.RowFilter[]) => void;
};

/** Adds, edits and removes the row filters applied to a published slice. */
export function RowFilterEditor({
  filterableColumns,
  rowFilters,
  setRowFilters,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap={6}>
      <Group justify="space-between" align="end">
        <Text size="sm" fw={500}>
          <Trans>Row filters</Trans>
        </Text>
        <AddRowFilterMenu
          columns={filterableColumns}
          onAdd={(rowFilter) => {
            return setRowFilters([...rowFilters, rowFilter]);
          }}
        />
      </Group>
      {rowFilters.length === 0 ? (
        <Text size="xs" c="dimmed">
          <Trans>
            No row filters. The slice will include every row in the dataset (for
            the selected columns).
          </Trans>
        </Text>
      ) : (
        <Stack gap="xs">
          {rowFilters.map((rowFilter, rowFilterIndex) => {
            return (
              <PublishSliceRowFilter
                key={
                  rowFilter.id ?? `${rowFilter.columnName}-${rowFilter.kind}`
                }
                rowFilter={rowFilter}
                columnType={
                  filterableColumns.find(propEq("name", rowFilter.columnName))
                    ?.type ?? "varchar"
                }
                onChange={(updatedRowFilter) => {
                  const nextRowFilters = rowFilters.slice();
                  nextRowFilters[rowFilterIndex] = updatedRowFilter;
                  setRowFilters(nextRowFilters);
                }}
                onRemove={() => {
                  setRowFilters(
                    rowFilters.filter((_, index) => {
                      return index !== rowFilterIndex;
                    }),
                  );
                }}
              />
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
