import { useT } from "@avandar/plugin-sdk";
import { Stack, Text } from "@avandar/plugin-ui";
import type { ReactNode } from "react";

/** The props the chart's `Tooltip` passes to its `content` component. */
type Props = {
  active: boolean;

  /** The hovered bar's bucket start, as `YYYY-MM-DD`. */
  label?: string | number;

  /** One entry per series in the hovered bar, with its label and count. */
  payload: ReadonlyArray<
    Readonly<{ name?: string | number; value?: unknown; dataKey?: unknown }>
  >;
};

/**
 * The case epicurve's tooltip: the hovered bucket's start date, then each
 * series' case count, such as "Ilala: 12". `CaseEpicurveChart` passes it to
 * the chart's `Tooltip` as its content.
 */
export function CaseEpicurveTooltip({
  active,
  label,
  payload,
}: Readonly<Props>): ReactNode {
  const t = useT();
  if (!active || payload.length === 0) {
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
        {label}
      </Text>
      {payload.map((entry) => {
        return (
          <Text key={String(entry.dataKey)} size="sm">
            {t("caseEpicurve.seriesCount", {
              series: String(entry.name),
              count: Number(entry.value),
            })}
          </Text>
        );
      })}
    </Stack>
  );
}
