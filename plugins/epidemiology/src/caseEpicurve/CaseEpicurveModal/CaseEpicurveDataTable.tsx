import { useT } from "@avandar/plugin-sdk";
import { Button, Stack, Table } from "@avandar/plugin-ui";
import { useId, useState } from "react";
import type { PluginVizTransformResult } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type Props = {
  epicurve: PluginVizTransformResult;
};

/** The tallest the table gets before it scrolls, in pixels. */
const TABLE_MAX_HEIGHT = 240;

/**
 * The case epicurve as a table, one row per bucket and one column per
 * series, behind a "Show as table" button. It gives screen reader users
 * the counts the chart draws, and everyone the exact numbers the tooltip
 * shows on hover. `CaseEpicurveView` renders it beneath the chart.
 */
export function CaseEpicurveDataTable({
  epicurve,
}: Readonly<Props>): ReactNode {
  const t = useT();
  const tableId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const { xColumn, series } = epicurve.chart;
  return (
    <Stack gap="xs" align="flex-start">
      <Button
        variant="subtle"
        size="xs"
        aria-expanded={isOpen}
        aria-controls={tableId}
        onClick={() => {
          setIsOpen((wasOpen) => {
            return !wasOpen;
          });
        }}
      >
        {isOpen ? t("caseEpicurve.hideTable") : t("caseEpicurve.showTable")}
      </Button>
      <Stack id={tableId} w="100%" gap={0}>
        {isOpen ? (
          <Table.ScrollContainer
            minWidth={240}
            maxHeight={TABLE_MAX_HEIGHT}
            tabIndex={0}
            role="region"
            aria-label={t("caseEpicurve.tableCaption")}
          >
            <Table stickyHeader>
              <Table.Caption>{t("caseEpicurve.tableCaption")}</Table.Caption>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th scope="col">
                    {t("caseEpicurve.tableBucket")}
                  </Table.Th>
                  {series.map((oneSeries) => {
                    return (
                      <Table.Th key={oneSeries.column} scope="col">
                        {oneSeries.label ?? oneSeries.column}
                      </Table.Th>
                    );
                  })}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {epicurve.rows.map((row) => {
                  return (
                    <Table.Tr key={String(row[xColumn])}>
                      <Table.Th scope="row">{String(row[xColumn])}</Table.Th>
                      {series.map((oneSeries) => {
                        return (
                          <Table.Td key={oneSeries.column}>
                            {String(row[oneSeries.column])}
                          </Table.Td>
                        );
                      })}
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : null}
      </Stack>
    </Stack>
  );
}
