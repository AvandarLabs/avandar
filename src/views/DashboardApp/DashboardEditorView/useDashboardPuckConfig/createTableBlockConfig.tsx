import { msg } from "@lingui/core/macro";
import { Table as MantineTable, Text } from "@mantine/core";
import { getTableRowsFromText } from "./DashboardConfigHelpers";
import type {
  AvaPageConfig,
  TableBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the TableBlock Puck configuration for the dashboard editor. */
export function createTableBlockConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["TableBlock"] {
  return {
    label: i18n._(msg`Table`),
    fields: {
      delimiter: {
        label: i18n._(msg`Delimiter`),
        type: "select",
        options: [
          { label: i18n._(msg`Comma (,)`), value: "comma" },
          { label: i18n._(msg`Tab`), value: "tab" },
          { label: i18n._(msg`Pipe (|)`), value: "pipe" },
        ],
      },
      hasHeader: {
        label: i18n._(msg`Header row`),
        type: "radio",
        options: [
          { label: i18n._(msg`Yes`), value: true },
          { label: i18n._(msg`No`), value: false },
        ],
      },
      data: {
        label: i18n._(msg`Data`),
        type: "textarea",
      },
    },
    defaultProps: {
      data: "label,value\nA,10\nB,20\nC,30",
      delimiter: "comma",
      hasHeader: true,
    },
    render: (props: TableBlockProps) => {
      const rows: ReadonlyArray<readonly string[]> = getTableRowsFromText({
        data: props.data,
        delimiter: props.delimiter,
      });

      if (rows.length === 0) {
        return (
          <Text c="dimmed" fz="sm">
            {i18n._(msg`Add tabular data to render a simple table.`)}
          </Text>
        );
      }

      const headerRow: readonly string[] | undefined = props.hasHeader
        ? rows[0]
        : undefined;
      const bodyRows: ReadonlyArray<readonly string[]> = props.hasHeader
        ? rows.slice(1)
        : rows;

      return (
        <MantineTable withTableBorder withColumnBorders withRowBorders>
          {headerRow ? (
            <MantineTable.Thead>
              <MantineTable.Tr>
                {headerRow.map((cell, idx) => {
                  return <MantineTable.Th key={idx}>{cell}</MantineTable.Th>;
                })}
              </MantineTable.Tr>
            </MantineTable.Thead>
          ) : null}
          <MantineTable.Tbody>
            {bodyRows.map((row, rowIdx) => {
              return (
                <MantineTable.Tr key={rowIdx}>
                  {row.map((cell, cellIdx) => {
                    return (
                      <MantineTable.Td key={cellIdx}>{cell}</MantineTable.Td>
                    );
                  })}
                </MantineTable.Tr>
              );
            })}
          </MantineTable.Tbody>
        </MantineTable>
      );
    },
  };
}
