import type { ReactNode } from "react";

import { objectEntries } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Group, Text } from "@mantine/core";

type Props = { properties: Readonly<Record<string, unknown>> };

/** Lists the configured properties of the selected feature. */
export function FeatureFields({ properties }: Props): ReactNode {
  const { t } = useLingui();
  const entries = objectEntries(properties);
  if (entries.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {t`This layer's popup shows no fields. Choose some in the layer's Popup section.`}
      </Text>
    );
  }
  return entries.map(([key, value]) => {
    return (
      <Group key={key} justify="space-between" align="flex-start" wrap="nowrap">
        <Text size="sm" fw={500} c="dimmed">
          {key}
        </Text>
        <Text size="sm" fw={500} ta="right">
          {value == null ? t`Not reported` : String(value)}
        </Text>
      </Group>
    );
  });
}
