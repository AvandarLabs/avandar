import { msg } from "@lingui/core/macro";
import { Box, Stack } from "@mantine/core";
import {
  clampNumColumns,
  clampSpanWithinColumns,
  getSpacingFromValue,
  renderSlot,
} from "./DashboardConfigHelpers";
import type { AvaPageConfig } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";

/** Creates the Columns Puck configuration for the dashboard editor. */
export function createColumnsConfig({
  i18n,
}: Readonly<{ i18n: I18n }>): AvaPageConfig["components"]["Columns"] {
  return {
    label: i18n._(msg`Columns`),
    fields: {
      numColumns: {
        label: i18n._(msg`Number of columns`),
        type: "number",
        min: 1,
        max: 12,
        step: 1,
      },
      leftSpan: {
        label: i18n._(msg`Left span`),
        type: "number",
        min: 1,
        max: 12,
        step: 1,
      },
      rightSpan: {
        label: i18n._(msg`Right span`),
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
      collapseAt: {
        label: i18n._(msg`Collapse at`),
        type: "select",
        options: [
          { label: i18n._(msg`Small`), value: "sm" },
          { label: i18n._(msg`Medium`), value: "md" },
          { label: i18n._(msg`Large`), value: "lg" },
        ],
      },
      col1: {
        label: i18n._(msg`Column 1`),
        type: "slot",
      },
      col2: {
        label: i18n._(msg`Column 2`),
        type: "slot",
      },
      col3: {
        label: i18n._(msg`Column 3`),
        type: "slot",
      },
      col4: {
        label: i18n._(msg`Column 4`),
        type: "slot",
      },
      col5: {
        label: i18n._(msg`Column 5`),
        type: "slot",
      },
      col6: {
        label: i18n._(msg`Column 6`),
        type: "slot",
      },
      col7: {
        label: i18n._(msg`Column 7`),
        type: "slot",
      },
      col8: {
        label: i18n._(msg`Column 8`),
        type: "slot",
      },
      col9: {
        label: i18n._(msg`Column 9`),
        type: "slot",
      },
      col10: {
        label: i18n._(msg`Column 10`),
        type: "slot",
      },
      col11: {
        label: i18n._(msg`Column 11`),
        type: "slot",
      },
      col12: {
        label: i18n._(msg`Column 12`),
        type: "slot",
      },
    },
    defaultProps: {
      collapseAt: "md",
      gap: "md",
      numColumns: 2,
      col1: [],
      col2: [],
      col3: [],
      col4: [],
      col5: [],
      col6: [],
      col7: [],
      col8: [],
      col9: [],
      col10: [],
      col11: [],
      col12: [],
    },
    render: (props) => {
      const gap: string = getSpacingFromValue(props.gap);
      const numColumns: number = clampNumColumns(props.numColumns);
      const leftSpan: number = clampSpanWithinColumns({
        numColumns,
        span: props.leftSpan ?? 1,
      });
      const rightSpanUpperBound: number = Math.max(
        1,
        numColumns - (leftSpan - 1),
      );
      const rightSpan: number = Math.min(
        clampSpanWithinColumns({
          numColumns,
          span: props.rightSpan ?? 1,
        }),
        rightSpanUpperBound,
      );
      const numVisibleColumns: number =
        numColumns - (leftSpan - 1) - (rightSpan - 1);
      const allColumns = [
        props.col1,
        props.col2,
        props.col3,
        props.col4,
        props.col5,
        props.col6,
        props.col7,
        props.col8,
        props.col9,
        props.col10,
        props.col11,
        props.col12,
      ] as const;
      const columnsToRender = allColumns.slice(0, numVisibleColumns);

      return (
        <Box
          display={{ base: "flex", [props.collapseAt]: "grid" }}
          style={{
            flexDirection: "column",
            gap,
            gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
          }}
        >
          {columnsToRender.map((col, idx) => {
            const span: number =
              numVisibleColumns === 1
                ? numColumns
                : idx === 0
                  ? leftSpan
                  : idx === numVisibleColumns - 1
                    ? rightSpan
                    : 1;

            return (
              <Stack key={idx} gap="md" style={{ gridColumn: `span ${span}` }}>
                {renderSlot(col, { minEmptyHeight: 160 })}
              </Stack>
            );
          })}
        </Box>
      );
    },
  };
}
