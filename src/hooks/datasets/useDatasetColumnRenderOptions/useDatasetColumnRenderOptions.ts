import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/**
 * Render options for the dataset-column fields the user may edit.
 *
 * Declared structurally rather than as an `ObjectKeyRenderOptionsMap`, because
 * that map is generic over the surrounding root data: these entries never look
 * at the root, so one value is valid in every list that shows columns.
 */
type DatasetColumnRenderOptions = {
  description: { renderAsType: "text" };
  dataType: {
    renderAsType: {
      type: "text";
      choices: Array<{ value: AvaDataType.T; label: string }>;
    };
    renderValue: (dataType: AvaDataType.T) => string;
  };
};

/**
 * How a dataset column's editable fields are rendered in a description list.
 *
 * Shared by every surface that shows dataset columns, so a type added to
 * `AvaDataType` or a relabelled field reaches all of them at once.
 *
 * Translate the type labels here rather than via `AvaDataType.toDisplayValue`:
 * that helper's display names are plain English, a shared model has no `t` in
 * scope, and Lingui only extracts a macro from the scope that binds it.
 */
export function useDatasetColumnRenderOptions(): DatasetColumnRenderOptions {
  const { t } = useLingui();
  const getDataTypeLabel = (dataType: AvaDataType.T): string => {
    return matchLiteral(dataType, {
      varchar: t`Text`,
      bigint: t`Integer`,
      double: t`Number`,
      time: t`Time`,
      date: t`Date`,
      timestamp: t`Timestamp`,
      boolean: t`Boolean`,
    });
  };

  return {
    description: {
      renderAsType: "text",
    },
    dataType: {
      renderAsType: {
        type: "text",
        choices: AvaDataType.Types.map((dataType) => {
          return {
            value: dataType,
            label: getDataTypeLabel(dataType),
          };
        }),
      },
      renderValue: getDataTypeLabel,
    },
  };
}

/**
 * The header a dataset column's field gets in a table, or `undefined` to let
 * the table title-case the key itself.
 */
export function useDatasetColumnTableHeader(): (
  key: keyof DatasetColumn.T,
) => string | undefined {
  const { t } = useLingui();
  const headersByKey: Partial<Record<keyof DatasetColumn.T, string>> = {
    name: t`Column Name`,
    dataType: t`Data Type`,
    description: t`Description`,
  };
  return (key) => {
    return headersByKey[key];
  };
}
