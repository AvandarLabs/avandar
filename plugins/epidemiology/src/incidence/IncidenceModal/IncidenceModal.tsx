import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Alert } from "@avandar/plugin-ui";
import {
  getColumnNamesFromColumns,
  NUMERIC_DATA_TYPES,
} from "../../derivedColumns/getColumnNamesFromColumns/getColumnNamesFromColumns";
import { IncidenceForm } from "./IncidenceForm";
import type { ReactNode } from "react";

/**
 * The content of the "Incidence per 100k" command's modal. The user picks a
 * numeric cases column, a population (a numeric column or a fixed number),
 * and a rate base, and the command adds the rate and its 95% confidence
 * interval to the Data Explorer query as three columns. Without a numeric
 * column, or outside the Data Explorer, it explains why instead.
 */
export function IncidenceModal(): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  const numericColumnNames = getColumnNamesFromColumns({
    columns: avandar.context.columns,
    dataTypes: NUMERIC_DATA_TYPES,
  });
  const [firstColumn, secondColumn] = numericColumnNames;
  if (avandar.dataExplorer === undefined) {
    return <Alert color="yellow">{t("incidence.unavailable")}</Alert>;
  }
  if (firstColumn === undefined) {
    return <Alert color="yellow">{t("incidence.noNumericColumns")}</Alert>;
  }
  return (
    <IncidenceForm
      numericColumnNames={numericColumnNames}
      initialCasesColumn={firstColumn}
      initialPopulationColumn={secondColumn}
    />
  );
}
