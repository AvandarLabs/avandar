import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Group, Text, TextInput } from "@mantine/core";

type Props = {
  rowFilter: Extract<PublishSliceConfig.RowFilter, { kind: "range_date" }>;
  startPlaceholder: string;
  endPlaceholder: string;
  onChange: (rowFilter: PublishSliceConfig.RowFilter) => void;
};

/** Operand editor for a `range_date` row filter: its start and end. */
export function DateRangeFilterInput({
  rowFilter,
  startPlaceholder,
  endPlaceholder,
  onChange,
}: Readonly<Props>): ReactNode {
  return (
    <Group gap="xs">
      <TextInput
        placeholder={startPlaceholder}
        value={rowFilter.start ?? ""}
        onChange={(event) => {
          onChange({ ...rowFilter, start: event.currentTarget.value });
        }}
      />
      <Text size="xs" c="dimmed">
        <Trans>to</Trans>
      </Text>
      <TextInput
        placeholder={endPlaceholder}
        value={rowFilter.end ?? ""}
        onChange={(event) => {
          onChange({ ...rowFilter, end: event.currentTarget.value });
        }}
      />
    </Group>
  );
}
