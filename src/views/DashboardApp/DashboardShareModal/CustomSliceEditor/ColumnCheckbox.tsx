import type { PublishSliceDataset } from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection/PublishSliceSection.types";
import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Badge, Checkbox, Group, Text } from "@mantine/core";

type Props = {
  column: PublishSliceDataset["columns"][number];
  isQueried: boolean;
  isSelected: boolean;
  selectedColumns: readonly string[];
  setColumns: (columns: readonly string[]) => void;
};

/** One selectable column in the slice's column picker. */
export function ColumnCheckbox({
  column,
  isQueried,
  isSelected,
  selectedColumns,
  setColumns,
}: Readonly<Props>): ReactNode {
  return (
    <Checkbox
      label={
        <Group gap={6}>
          <Text size="sm">{column.name}</Text>
          <Badge size="xs" variant="outline" color="neutral">
            {column.dataType}
          </Badge>
          {isQueried ? (
            <Badge size="xs" variant="light" color="teal">
              <Trans>queried</Trans>
            </Badge>
          ) : null}
        </Group>
      }
      checked={isSelected}
      onChange={(event) => {
        const columnNames = new Set(selectedColumns);
        if (event.currentTarget.checked) {
          columnNames.add(column.name);
        } else {
          columnNames.delete(column.name);
        }
        setColumns(Array.from(columnNames));
      }}
    />
  );
}
