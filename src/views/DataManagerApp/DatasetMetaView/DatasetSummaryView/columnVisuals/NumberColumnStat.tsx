import type { ReactElement } from "react";

import { Stack, Text } from "@mantine/core";

type Props = {
  label: string;
  value: string;
  accent?: boolean;
};

/** Displays one labeled numeric column statistic. */
export function NumberColumnStat({
  label,
  value,
  accent,
}: Props): ReactElement {
  return (
    <Stack gap={0}>
      <Text
        size="sm"
        fw={accent ? 700 : 600}
        c={accent ? "primary.7" : "neutral.9"}
        ff="monospace"
      >
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Stack>
  );
}
