import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { PublishSliceDataset } from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection/PublishSliceSection.types";
import type { ReactNode } from "react";

import { prop } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Button, Group, ScrollArea, Stack, Text } from "@mantine/core";

import { ColumnCheckbox } from "@/views/DashboardApp/DashboardShareModal/CustomSliceEditor/ColumnCheckbox";

type Props = {
  dataset: PublishSliceDataset;
  queriedColumnNames: ReadonlySet<string>;
  selectedColumnNames: ReadonlySet<string>;
  setColumns: (columns: readonly string[]) => void;
  slice: Extract<PublishSliceConfig.T, { mode: "custom" }>;
};

/** Chooses which of the dataset's columns the published slice carries. */
export function ColumnPicker({
  dataset,
  queriedColumnNames,
  selectedColumnNames,
  setColumns,
  slice,
}: Readonly<Props>): ReactNode {
  return (
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
              return setColumns(dataset.columns.map(prop("name")));
            }}
          >
            <Trans>Select all</Trans>
          </Button>
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => {
              return setColumns([...dataset.queriedColumns]);
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
            return (
              <ColumnCheckbox
                key={column.id}
                column={column}
                isQueried={queriedColumnNames.has(column.name)}
                isSelected={selectedColumnNames.has(column.name)}
                selectedColumns={slice.columns}
                setColumns={setColumns}
              />
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
