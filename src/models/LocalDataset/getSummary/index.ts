import { match } from "ts-pattern";
import { isNotUndefined } from "@/lib/utils/guards";
import { rowsToColumns } from "@/lib/utils/objects/rowsToColumns";
import { FieldDataType } from "../LocalDatasetField/types";
import { ParsedLocalDataset } from "../types";
import { getAverageValue } from "./getAverageValue";
import { getDistinctValuesCount } from "./getDistinctValuesCount";
import { getEmptyValuesCount } from "./getEmptyValuesCount";
import { getMaxValue } from "./getMaxValue";
import { getMinValue } from "./getMinValue";
import { getMostCommonValue } from "./getMostCommonValue";
import { getStandardDeviation } from "./getStandardDeviation";

type UnknownFieldSummary = {
  type: "unknown";
};

type StringFieldSummary = {
  type: "string";
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

type FieldSummary = {
  name: string;
  distinctValuesCount: number;
  emptyValuesCount: number;
  percentMissingValues: number;
  mostCommonValue: {
    count: number;
    value: string[];
  };
} & (
  | StringFieldSummary
  | UnknownFieldSummary
  | NumericFieldSummary
  | DateFieldSummary
);

type DatasetSummary = {
  rows: number;
  columns: number;
  emptyRows: number;
  columnSummaries?: readonly FieldSummary[];
};

function _getTypeSpecificSummary(
  values: unknown[],
  dataType: FieldDataType,
):
  | StringFieldSummary
  | UnknownFieldSummary
  | NumericFieldSummary
  | DateFieldSummary {
  return match(dataType)
    .with("string", (type) => {
      return {
        type,
      };
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
    .with("unknown", (type) => {
      return {
        type,
      };
    })
    .exhaustive();
}

// TODO(jpsyx): dont do any of this in main thread. Load dataset using DuckDB
// client and query using LocalQueryClient. For now we're using the main thread
// just for prototyping.
export function getSummary(dataset: ParsedLocalDataset): DatasetSummary {
  const columnValues = rowsToColumns(dataset.data);

  return {
    rows: dataset.data.length,
    columns: dataset.fields.length,
    emptyRows: 0,
    columnSummaries:
      dataset.data.length === 0 ?
        undefined
      : dataset.fields
          .map((column) => {
            const columnName = column.name;
            if (
              columnName in columnValues &&
              columnValues[columnName] !== undefined
            ) {
              const values = columnValues[columnName];
              const valueCount = values.length;
              const emptyValCount = getEmptyValuesCount(values);

              return {
                name: columnName,
                distinctValuesCount: getDistinctValuesCount(values),
                emptyValuesCount: emptyValCount,
                percentMissingValues: emptyValCount / valueCount,
                mostCommonValue: getMostCommonValue(values),
                ..._getTypeSpecificSummary(values, column.dataType),
              };
            }
            return undefined;
          })
          .filter(isNotUndefined),
  };
}
