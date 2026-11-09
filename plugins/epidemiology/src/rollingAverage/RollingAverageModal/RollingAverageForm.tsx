import { useT } from "@avandar/plugin-sdk";
import { Stack, Text } from "@avandar/plugin-ui";
import { AddColumnsFooter } from "../../derivedColumns/AddColumnsFooter";
import { ColumnPickers } from "./ColumnPickers";
import { useRollingAverageForm } from "./useRollingAverageForm";
import { WindowFields } from "./WindowFields";
import type { ReactNode } from "react";

type Props = {
  /** Every result column, in result order, for the group-by picker. */
  columnNames: readonly string[];
  numericColumnNames: readonly string[];
  dateColumnNames: readonly string[];
  initialValueColumn: string | undefined;
  initialDateColumn: string;
};

/**
 * The column pickers, the window fields, and the button that adds the
 * rolling average column. `RollingAverageModal` renders it once the result
 * has a date column. The value column can be left empty.
 */
export function RollingAverageForm(props: Readonly<Props>): ReactNode {
  const t = useT();
  const form = useRollingAverageForm(props);
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        {t("rollingAverage.description")}
      </Text>
      <ColumnPickers
        numericColumnNames={props.numericColumnNames}
        dateColumnNames={props.dateColumnNames}
        groupByColumnNames={form.groupByColumnNames}
        value={form.columnsInput}
        onChange={form.setColumnsInput}
      />
      <WindowFields value={form.windowInput} onChange={form.setWindowInput} />
      <Text size="sm" c="dimmed">
        {form.columnsInput.valueColumn === undefined
          ? t("rollingAverage.eachRowCounts")
          : t("rollingAverage.oneRowPerDate")}
      </Text>
      <AddColumnsFooter
        buttonLabel={t("rollingAverage.add")}
        errorText={
          form.errorMessage === undefined
            ? undefined
            : t("rollingAverage.failed", { message: form.errorMessage })
        }
        isAdding={form.isAdding}
        isDisabled={form.isAddDisabled}
        onAdd={form.onAdd}
      />
    </Stack>
  );
}
