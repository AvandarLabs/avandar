import { useLingui } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import type { DataSlotCheckResult } from "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slot: PluginDataSlot;
  slotTitle: string;
  localize: (value: string) => string;
  sampleRows: DataSlotCheckResult["sampleRows"];
}>;

function _getTextFromCellValue(value: unknown, locale: string): string {
  if (value === null || value === undefined) {
    return "";
  }
  return value instanceof Date
    ? value.toLocaleDateString(locale)
    : String(value);
}

/**
 * The first rows a data slot's mapping reads, one column per slot attribute
 * titled in the plugin's words, so an admin can see the fields line up.
 * Part of `DataSlotCheckSummary`.
 */
export function DataSlotCheckSampleTable({
  slot,
  slotTitle,
  localize,
  sampleRows,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const attributeKeys = Object.keys(slot.attributes);
  return (
    <Table.ScrollContainer minWidth={320}>
      <Table withTableBorder fz="sm">
        <Table.Caption>{t`First rows of ${slotTitle}`}</Table.Caption>
        <Table.Thead>
          <Table.Tr>
            {Object.entries(slot.attributes).map(
              ([attributeKey, attribute]) => {
                return (
                  <Table.Th key={attributeKey}>
                    {localize(attribute.title)}
                  </Table.Th>
                );
              },
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sampleRows.map((row, rowIndex) => {
            return (
              // Sample rows have no id, and their order never changes.
              <Table.Tr key={rowIndex}>
                {attributeKeys.map((attributeKey) => {
                  return (
                    <Table.Td key={attributeKey}>
                      {_getTextFromCellValue(
                        getOwnValue(row, attributeKey),
                        i18n.locale,
                      )}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
