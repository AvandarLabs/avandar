import { Plural, useLingui } from "@lingui/react/macro";
import { List, Stack, Text } from "@mantine/core";
import { DataSlotCheckSampleTable } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckSampleTable";
import type { DataSlotCheckResult } from "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slot: PluginDataSlot;
  slotTitle: string;
  localize: (value: string) => string;
  result: DataSlotCheckResult;
}>;

/**
 * What a data slot check found: the row count, each attribute's count of
 * rows with a value, and the first rows. `DataSlotCheckPreview` shows it
 * once the check finishes.
 */
export function DataSlotCheckSummary({
  slot,
  slotTitle,
  localize,
  result,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const rowCount = i18n.number(result.rowCount);
  return (
    <Stack gap="sm">
      <Text size="sm" fw={500} role="status">
        <Plural value={result.rowCount} one="# record" other="# records" />
      </Text>
      <List size="sm">
        {Object.entries(slot.attributes).map(([attributeKey, attribute]) => {
          const title = localize(attribute.title);
          const filledCount = i18n.number(
            result.filledCountsByAttributeKey[attributeKey] ?? 0,
          );
          return (
            <List.Item key={attributeKey}>
              {t`${title}: ${filledCount} of ${rowCount} have a value`}
            </List.Item>
          );
        })}
      </List>
      <DataSlotCheckSampleTable
        slot={slot}
        slotTitle={slotTitle}
        localize={localize}
        sampleRows={result.sampleRows}
      />
    </Stack>
  );
}
