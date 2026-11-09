import { Stack, Text } from "@avandar/plugin-ui";
import type { RatePlotChartRow } from "./RatePlot.types";
import type { ReactNode } from "react";

/** The props the chart's `Tooltip` passes to its `content` component. */
type Props = {
  active: boolean;
  /** The hovered entries. Each holds its chart row as `payload`. */
  payload: ReadonlyArray<Readonly<{ payload?: RatePlotChartRow }>>;
};

/**
 * The rate plot's tooltip: the hovered row's label, then its rate and
 * interval, such as "12.4 (9.8–15.6)". `RatePlotChart` passes it to the
 * chart's `Tooltip` as its content.
 */
export function RatePlotTooltip({
  active,
  payload,
}: Readonly<Props>): ReactNode {
  const row = payload[0]?.payload;
  if (!active || row === undefined) {
    return null;
  }
  return (
    <Stack
      gap={2}
      p="xs"
      bg="var(--mantine-color-body)"
      bd="1px solid var(--mantine-color-default-border)"
      bdrs="sm"
    >
      <Text size="sm" fw={600}>
        {row.label}
      </Text>
      <Text size="sm">{row.rateText}</Text>
    </Stack>
  );
}
