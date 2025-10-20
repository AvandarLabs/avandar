import { isNonEmptyArray } from "@/lib/utils/guards/guards";
import { AvaDataTypeUtils } from "../datasets/AvaDataType";
import { PartialStructuredQuery } from "../queries/StructuredQuery";
import {
  QueryColumn,
  StructuredQueryUtils,
} from "../queries/StructuredQuery/StructuredQueryUtils";

function _getColumnNameWithAggregation(column: QueryColumn): string {
  const { aggregation, sourceColumn } = column;
  if (
    aggregation === undefined || aggregation === "none" ||
    aggregation === "group_by"
  ) {
    return sourceColumn.name;
  }
  return `${aggregation}("${sourceColumn.name}")`;
}

export function hydrateXYFromQuery<
  VConfig extends {
    xAxisKey: string | undefined;
    yAxisKey: string | undefined;
  },
>(
  vizConfig: VConfig,
  query: PartialStructuredQuery,
): VConfig {
  const { xAxisKey, yAxisKey } = vizConfig;
  let newVizConfig: VConfig = vizConfig;
  if (xAxisKey === undefined || yAxisKey === undefined) {
    const queryColumns = StructuredQueryUtils.getQueryColumns(query);

    // if we're missing an X axis, choose the first column available
    if (xAxisKey === undefined && isNonEmptyArray(queryColumns)) {
      const firstColumn = queryColumns[0];
      newVizConfig = {
        ...newVizConfig,
        xAxisKey: _getColumnNameWithAggregation(firstColumn!),
      };
    }

    // if we're missing a Y axis, choose the first numeric column available
    if (yAxisKey === undefined && isNonEmptyArray(queryColumns)) {
      const firstNumericColumn = queryColumns.find((column) => {
        return AvaDataTypeUtils.isNumeric(
          column.columnType === "DatasetColumn"
            ? column.sourceColumn.dataType
            : column.sourceColumn.options.baseDataType,
        );
      });

      if (firstNumericColumn !== undefined) {
        newVizConfig = {
          ...newVizConfig,
          yAxisKey: _getColumnNameWithAggregation(firstNumericColumn),
        };
      }
    }
  }
  return newVizConfig;
}
