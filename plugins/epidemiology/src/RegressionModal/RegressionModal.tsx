import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Alert } from "@avandar/plugin-ui";
import { RegressionForm } from "./RegressionForm";
import type { AvandarApi } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

function _getNumericColumnNames(
  columns: AvandarApi["context"]["columns"],
): string[] {
  return columns
    .filter((column) => {
      return column.dataType === "bigint" || column.dataType === "double";
    })
    .map((column) => {
      return column.name;
    });
}

/**
 * The content of the "Linear regression" command's modal. The user picks a
 * numeric predictor (X) and outcome (Y) from the open query result and fits a
 * least-squares line to them, then reads the slope, intercept, R squared, and
 * the number of rows used. With fewer than two numeric columns it explains
 * that there is nothing to fit instead.
 */
export function RegressionModal(): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  const columnNames = _getNumericColumnNames(avandar.context.columns);
  const [firstColumn, secondColumn] = columnNames;
  if (firstColumn === undefined || secondColumn === undefined) {
    return <Alert color="yellow">{t("modal.notEnoughData")}</Alert>;
  }
  return (
    <RegressionForm
      columnNames={columnNames}
      initialXColumn={firstColumn}
      initialYColumn={secondColumn}
    />
  );
}
