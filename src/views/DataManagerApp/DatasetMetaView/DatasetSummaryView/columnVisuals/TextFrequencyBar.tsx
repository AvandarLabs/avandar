import type { ReactElement } from "react";

import { Box, Group, Text } from "@mantine/core";

type Props = {
  label: string;
  share: number;
  shareLabel: string;
  count: number;
};

/** Displays the frequency of one common text value. */
export function TextFrequencyBar({
  label,
  share,
  shareLabel,
  count,
}: Props): ReactElement {
  const widthPercent = Math.max(2, share * 100);
  return (
    <Box>
      <Group gap="sm" justify="space-between" mb={2}>
        <Text
          size="sm"
          ff="monospace"
          truncate
          style={{ flex: 1, minWidth: 0 }}
        >
          {label}
        </Text>
        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
          {count.toLocaleString()} · {shareLabel}
        </Text>
      </Group>
      <Box h={6} bg="neutral.0" style={{ borderRadius: 3, overflow: "hidden" }}>
        <Box
          h="100%"
          w={`${widthPercent}%`}
          bg="primary.5"
          style={{ borderRadius: 3 }}
        />
      </Box>
    </Box>
  );
}
