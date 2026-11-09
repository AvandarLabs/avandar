import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Alert } from "@avandar/plugin-ui";
import {
  getColumnNamesFromColumns,
  NUMERIC_DATA_TYPES,
  TEMPORAL_DATA_TYPES,
} from "../../derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns";
import { RollingAverageForm } from "./RollingAverageForm";
import type { ReactNode } from "react";

/**
 * The content of the "Rolling average" command's modal. The user picks a
 * numeric value column, a date column, a window in days or weeks, and an
 * optional group-by column, and the command adds the rolling average to the
 * Data Explorer query as one column. Without a numeric and a date column, or
 * outside the Data Explorer, it explains why instead.
 */
export function RollingAverageModal(): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  const { columns } = avandar.context;
  const numericColumnNames = getColumnNamesFromColumns({
    columns,
    dataTypes: NUMERIC_DATA_TYPES,
  });
  const dateColumnNames = getColumnNamesFromColumns({
    columns,
    dataTypes: TEMPORAL_DATA_TYPES,
  });
  const [firstNumericColumn] = numericColumnNames;
  const [firstDateColumn] = dateColumnNames;
  if (avandar.dataExplorer === undefined) {
    return <Alert color="yellow">{t("rollingAverage.unavailable")}</Alert>;
  }
  if (firstNumericColumn === undefined || firstDateColumn === undefined) {
    return <Alert color="yellow">{t("rollingAverage.missingColumns")}</Alert>;
  }
  return (
    <RollingAverageForm
      columnNames={columns.map((column) => {
        return column.name;
      })}
      numericColumnNames={numericColumnNames}
      dateColumnNames={dateColumnNames}
      initialValueColumn={firstNumericColumn}
      initialDateColumn={firstDateColumn}
    />
  );
}
