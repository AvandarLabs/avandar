import { makeArrayWithLength } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { Box, Stack } from "@mantine/core";
import {
  buildGridCellKeyFromCoordinates,
  clampNumColumns,
  clampNumRows,
  createGridCellSlotFields,
  createGridDefaultProps,
  getSpacingFromValue,
  renderSlot,
} from "./DashboardConfigHelpers";
import type { AvaPageConfig } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the Grid Puck configuration for the dashboard editor. */
export function createGridConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["Grid"] {
  return {
    label: i18n._(msg`Grid`),
    fields: {
      numColumns: {
        label: i18n._(msg`Number of columns`),
        type: "number",
        min: 1,
        max: 12,
        step: 1,
      },
      numRows: {
        label: i18n._(msg`Number of rows`),
        type: "number",
        min: 1,
        max: 12,
        step: 1,
      },
      gap: {
        label: i18n._(msg`Gap`),
        type: "select",
        options: [
          { label: i18n._(msg`Extra small`), value: "xs" },
          { label: i18n._(msg`Small`), value: "sm" },
          { label: i18n._(msg`Medium`), value: "md" },
          { label: i18n._(msg`Large`), value: "lg" },
        ],
      },
      ...createGridCellSlotFields(i18n),
    },
    defaultProps: {
      gap: "md",
      numColumns: 3,
      numRows: 2,
      ...createGridDefaultProps(),
    },
    render: (props) => {
      const gap: string = getSpacingFromValue(props.gap);
      const numColumns: number = clampNumColumns(props.numColumns);
      const numRows: number = clampNumRows(props.numRows);

      return (
        <Stack gap={gap}>
          {makeArrayWithLength(numRows).map((unusedRow, rowIdx) => {
            void unusedRow;

            return (
              <Box
                key={rowIdx}
                display="grid"
                style={{
                  gap,
                  gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
                }}
              >
                {makeArrayWithLength(numColumns).map((unusedCol, colIdx) => {
                  void unusedCol;

                  const key: `r${number}c${number}` =
                    buildGridCellKeyFromCoordinates({
                      colIdx,
                      rowIdx,
                    });
                  const cell: unknown = props[key];

                  return (
                    <Stack key={colIdx} gap="md">
                      {renderSlot(cell, { minEmptyHeight: 160 })}
                    </Stack>
                  );
                })}
              </Box>
            );
          })}
        </Stack>
      );
    },
  };
}
