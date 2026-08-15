import { Plural, Trans } from "@lingui/react/macro";
import { Badge, Group, ScrollArea, Stack, Text } from "@mantine/core";
import type { PublishSliceDataset } from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection.types";
import type { ReactNode } from "react";

type Props = {
  dataset: PublishSliceDataset;
};

/** Previews the columns included by queried-only publication. */
export function QueriedSlicePreview({ dataset }: Props): ReactNode {
  if (dataset.treatAsAllColumns) {
    return (
      <Text size="xs" c="dimmed">
        <Trans>
          At least one query on this dataset uses <code>SELECT *</code> or
          couldn't be parsed safely, so all columns will be published.
        </Trans>
      </Text>
    );
  }
  const columns = dataset.queriedColumns;
  if (columns.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        <Trans>
          No columns detected for this dataset. Falling back to all columns.
        </Trans>
      </Text>
    );
  }
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        <Plural
          value={columns.length}
          one="Will publish # column:"
          other="Will publish # columns:"
        />
      </Text>
      <ScrollArea.Autosize mah={120}>
        <Group gap={4}>
          {columns.map((columnName) => {
            return (
              <Badge key={columnName} size="sm" variant="light" color="teal">
                {columnName}
              </Badge>
            );
          })}
        </Group>
      </ScrollArea.Autosize>
    </Stack>
  );
}
