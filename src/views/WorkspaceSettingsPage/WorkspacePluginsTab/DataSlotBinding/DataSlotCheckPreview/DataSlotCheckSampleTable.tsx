import { useLingui } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { makeDataGridColumnDefs } from "@/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import type { DataSlotCheckResult } from "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slot: PluginDataSlot;
  slotTitle: string;
  localize: (value: string) => string;
  sampleRows: DataSlotCheckResult["sampleRows"];
}>;

/**
 * Makes a function that writes one sample cell as text, the way the data
 * grid does: a `date` attribute shows as a calendar day (with the time when
 * the sample holds times), in UTC so it matches the stored value for every
 * viewer, and other values read like any grid cell.
 */
function _makeCellFormatter(
  options: Readonly<{
    slot: PluginDataSlot;
    sampleRows: Props["sampleRows"];
  }>,
): (attributeKey: string, value: unknown) => string {
  const { slot, sampleRows } = options;
  const attributeKeys = Object.keys(slot.attributes);
  const columnDefs = makeDataGridColumnDefs({
    columnNames: attributeKeys,
    data: [...sampleRows],
    dateColumns: new Set(
      attributeKeys.filter((attributeKey) => {
        return getOwnValue(slot.attributes, attributeKey)?.type === "date";
      }),
    ),
    dateFormat: "YYYY-MM-DD HH:mm:ss",
  });
  return (attributeKey, value) => {
    const columnDef = columnDefs.find((candidate) => {
      return candidate.field === attributeKey;
    });
    return columnDef?.valueFormatter({ value }) ?? "";
  };
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
  const { t } = useLingui();
  const attributeKeys = Object.keys(slot.attributes);
  const formatCell = _makeCellFormatter({ slot, sampleRows });
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
                      {formatCell(attributeKey, getOwnValue(row, attributeKey))}
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
