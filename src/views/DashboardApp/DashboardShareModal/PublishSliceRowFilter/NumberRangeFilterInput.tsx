import { Trans } from "@lingui/react/macro";
import { Group, NumberInput, Text } from "@mantine/core";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { ReactNode } from "react";

type Props = {
  rowFilter: Extract<PublishSliceConfig.RowFilter, { kind: "range_number" }>;
  minPlaceholder: string;
  maxPlaceholder: string;
  onChange: (rowFilter: PublishSliceConfig.RowFilter) => void;
};

/** Operand editor for a `range_number` row filter: its inclusive bounds. */
export function NumberRangeFilterInput({
  rowFilter,
  minPlaceholder,
  maxPlaceholder,
  onChange,
}: Readonly<Props>): ReactNode {
  return (
    <Group gap="xs">
      <NumberInput
        placeholder={minPlaceholder}
        value={rowFilter.min ?? ""}
        onChange={(minimum) => {
          onChange({
            ...rowFilter,
            min: typeof minimum === "number" ? minimum : undefined,
          });
        }}
      />
      <Text size="xs" c="dimmed">
        <Trans>to</Trans>
      </Text>
      <NumberInput
        placeholder={maxPlaceholder}
        value={rowFilter.max ?? ""}
        onChange={(maximum) => {
          onChange({
            ...rowFilter,
            max: typeof maximum === "number" ? maximum : undefined,
          });
        }}
      />
    </Group>
  );
}
