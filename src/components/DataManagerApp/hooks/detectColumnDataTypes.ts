import { RawCellValue, RawDataRow } from "@/lib/types/common";
import {
  DatasetColumn,
  DatasetColumnDataType,
} from "@/models/datasets/DatasetColumn";

function guessDataTypeFromColumnName(fieldName: string): DatasetColumnDataType {
  const lowercaseName = fieldName.toLowerCase();
  if (lowercaseName.includes("date")) {
    return "date";
  }

  if (lowercaseName.includes("name")) {
    return "text";
  }

  return "text";
}

function isParseableNumber(value: string): boolean {
  if (value.startsWith("+")) {
    // if the string starts with a + it is more likely a
    // phone number than a number.
    return false;
  }

  return !isNaN(Number(value));
}

function isParseableDate(value: string): boolean {
  return !isNaN(Date.parse(value));
}

/**
 * Detects the data type of a single array of values. The column name must also
 * be included, since this can also provide a hint for the data type.
 * @param columnName The name of the column to detect the data type for.
 * @param values The raw values.
 * @returns The detected data type.
 */
function detectColumnDataType(
  columnName: string,
  values: readonly RawCellValue[],
): DatasetColumnDataType {
  const fallbackType = guessDataTypeFromColumnName(columnName);
  if (values.length === 0) {
    return fallbackType;
  }

  const dataTypeCounts = {
    number: 0,
    string: 0,
    date: 0,
    empty: 0,
  };

  values.forEach((value) => {
    if (value === "" || value === undefined) {
      dataTypeCounts.empty += 1;
    } else if (isParseableNumber(value)) {
      dataTypeCounts.number += 1;
    } else if (isParseableDate(value)) {
      dataTypeCounts.date += 1;
    } else {
      dataTypeCounts.string += 1;
    }
  });

  const totalValues = values.length;
  if (totalValues === dataTypeCounts.empty) {
    // if all values are empty, go with the fallback
    return fallbackType;
  }

  const totalNonEmptyValues = totalValues - dataTypeCounts.empty;
  if (dataTypeCounts.number === totalNonEmptyValues) {
    return "number";
  }
  if (dataTypeCounts.string === totalNonEmptyValues) {
    return "text";
  }
  if (dataTypeCounts.date === totalNonEmptyValues) {
    return "date";
  }

  // if no clear majority, go with the fallback
  return fallbackType;
}

/**
 * This is a subset of a DatasetColumn type with only
 */
export type DetectedDatasetColumn = Pick<
  DatasetColumn,
  "name" | "dataType" | "columnIdx"
>;

/**
 * Detects the data type of an array of columns and their values.
 * @param columnNames The names of the columns to detect the data type for.
 * @param data The raw data.
 * @returns The detected data types.
 */
export function detectColumnDataTypes(
  columnNames: readonly string[],
  data: RawDataRow[],
): DetectedDatasetColumn[] {
  // Convert the CSV to a columnar format
  const columns = columnNames.reduce(
    (obj, fieldName) => {
      obj[fieldName] = [];
      return obj;
    },
    {} as Record<string, RawCellValue[]>,
  );

  // fill up the column arrays
  data.forEach((row) => {
    Object.keys(row).forEach((fieldName) => {
      columns[fieldName]?.push(row[fieldName]!);
    });
  });

  return columnNames.map((columnName, idx) => {
    const columnValues = columns[columnName];
    return {
      name: columnName,
      dataType: detectColumnDataType(columnName, columnValues ?? []),
      columnIdx: idx,
    };
  });
}
