import { invariant } from "@tanstack/react-router";
import { match } from "ts-pattern";
import { RawDataRow } from "@/lib/types/common";
import { isDefined } from "@/lib/utils/guards";
import { rowsToColumns } from "@/lib/utils/objects/rowsToColumns";
import {
  DatasetColumn,
  DatasetColumnDataType,
} from "@/models/datasets/DatasetColumn";
import { getAverageValue } from "./getAverageValue";
import { getDistinctValuesCount } from "./getDistinctValuesCount";
import { getEmptyValuesCount } from "./getEmptyValuesCount";
import { getMaxValue } from "./getMaxValue";
import { getMinValue } from "./getMinValue";
import { getMostCommonValue } from "./getMostCommonValue";
import { getStandardDeviation } from "./getStandardDeviation";

type TextFieldSummary = {
  type: "text";
};

type NumericFieldSummary = {
  type: "number";
  maxValue: number;
  minValue: number;
  averageValue: number;
  stdDev: number;
};

type DateFieldSummary = {
  type: "date";
  mostRecentDate: string;
  oldestDate: string;
  datasetDuration: string;
};

export type ColumnSummary = {
  name: string;
  distinctValuesCount: number;
  emptyValuesCount: number;
  percentMissingValues: number;
  mostCommonValue: {
    count: number;
    value: string[];
  };
} & (TextFieldSummary | NumericFieldSummary | DateFieldSummary);

export type DatasetSummary = {
  rows: number;
  columns: number;
  columnSummaries?: readonly ColumnSummary[];
};

function _getTypeSpecificSummary(
  values: unknown[],
  dataType: DatasetColumnDataType,
): TextFieldSummary | NumericFieldSummary | DateFieldSummary {
  return match(dataType)
    .with("text", (type) => {
      return { type };
    })
    .with("number", (type) => {
      return {
        type,
        maxValue: getMaxValue(values),
        minValue: getMinValue(values),
        averageValue: getAverageValue(values),
        stdDev: getStandardDeviation(values),
      };
    })
    .with("date", (type) => {
      return {
        type,
        mostRecentDate: "2020-01-01",
        oldestDate: "2019-01-01",
        datasetDuration: "1 year",
      };
    })
    .exhaustive();
}

// TODO(jpsyx): dont do any of this in main thread. Load dataset using DuckDB
// client and query using LocalQueryClient. For now we're using the main thread
// just for prototyping.
export function getSummary({
  dataRows,
  columns,
}: {
  dataRows: RawDataRow[];
  columns: DatasetColumn[];
}): DatasetSummary {
  const columnValues = rowsToColumns(dataRows);

  return {
    rows: dataRows.length,
    columns: columns.length,
    columnSummaries:
      dataRows.length === 0 ?
        undefined
      : columns
          .map((column) => {
            if (
              column.name in columnValues &&
              columnValues[column.name] !== undefined
            ) {
              const values = columnValues[column.name];
              invariant(
                values,
                `No values were found for column ${column.name}`,
              );

              const valueCount = values.length;
              const emptyValCount = getEmptyValuesCount(values);

              return {
                name: column.name,
                distinctValuesCount: getDistinctValuesCount(values),
                emptyValuesCount: emptyValCount,
                percentMissingValues: emptyValCount / valueCount,
                mostCommonValue: getMostCommonValue(values),
                ..._getTypeSpecificSummary(values, column.dataType),
              };
            }
            return undefined;
          })
          .filter(isDefined),
  };
}
