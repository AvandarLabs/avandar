import { useT } from "@avandar/plugin-sdk";
import { Select, Stack } from "@avandar/plugin-ui";
import type { RollingAverageColumnsInput } from "./RollingAverageModal.types";
import type { ReactNode } from "react";

type Props = {
  numericColumnNames: readonly string[];
  dateColumnNames: readonly string[];

  /** Every result column except the chosen value and date columns. */
  groupByColumnNames: readonly string[];
  value: RollingAverageColumnsInput;
  onChange: (value: RollingAverageColumnsInput) => void;
};

/**
 * The value, date, and optional group-by column pickers of the rolling
 * average form. `RollingAverageForm` owns the chosen columns.
 */
export function ColumnPickers(props: Readonly<Props>): ReactNode {
  const { value, onChange } = props;
  const t = useT();
  return (
    <Stack gap="xs">
      <Select
        label={t("rollingAverage.valueColumn")}
        placeholder={t("rollingAverage.valueColumn.none")}
        data={props.numericColumnNames}
        value={value.valueColumn ?? null}
        clearable
        clearButtonProps={{
          "aria-label": t("rollingAverage.valueColumn.clear"),
          "aria-hidden": false,
          tabIndex: 0,
        }}
        onChange={(valueColumn) => {
          onChange({ ...value, valueColumn: valueColumn ?? undefined });
        }}
      />
      <Select
        label={t("rollingAverage.dateColumn")}
        data={props.dateColumnNames}
        value={value.dateColumn}
        allowDeselect={false}
        onChange={(dateColumn) => {
          if (dateColumn !== null) {
            onChange({ ...value, dateColumn });
          }
        }}
      />
      <Select
        label={t("rollingAverage.groupByColumn")}
        placeholder={t("rollingAverage.groupByColumn.none")}
        data={props.groupByColumnNames}
        value={value.groupByColumn ?? null}
        clearable
        onChange={(groupByColumn) => {
          onChange({ ...value, groupByColumn: groupByColumn ?? undefined });
        }}
      />
    </Stack>
  );
}
