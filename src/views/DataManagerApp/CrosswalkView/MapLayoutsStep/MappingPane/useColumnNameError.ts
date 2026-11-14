import { useLingui } from "@lingui/react/macro";
import { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { ColumnNameProblem } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/getColumnNameProblem/getColumnNameProblem";

/** The error a name field shows for a column name problem, or undefined. */
export function useColumnNameError(): (
  problem: ColumnNameProblem | undefined,
  name: string,
) => string | undefined {
  const { t } = useLingui();
  const sourceColumnName = Crosswalk.SOURCE_COLUMN_NAME;
  return (problem, name) => {
    const trimmedName = name.trim();
    switch (problem) {
      case "blank":
        return t`Enter a name.`;
      case "taken":
        return t`${trimmedName} is already a column of the combined dataset.`;
      case "source_column":
        return t`${sourceColumnName} is the column that names each row's dataset. Choose another name.`;
      default:
        return undefined;
    }
  };
}
