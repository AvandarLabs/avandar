import { Box, Group, Text } from "@mantine/core";
import type { ReactElement } from "react";

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
      {/*
        The track has to be visible for the fill to read as a proportion of
        it, so it takes `neutral.1` rather than the ground's `neutral.0`.
      */}
      <Box h={6} bg="neutral.1" style={{ borderRadius: 3, overflow: "hidden" }}>
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
