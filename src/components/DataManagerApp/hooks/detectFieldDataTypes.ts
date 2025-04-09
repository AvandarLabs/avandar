import * as DatasetField from "@/models/DatasetField";
import { CSVCellValue, CSVData } from "@/types/common";
import { uuid } from "@/utils/uuid";

const THRESHOLD = 0.9; // 80% of values should match the type

function guessDataTypeFromFieldName(fieldName: string): DatasetField.DataType {
  const lowercaseName = fieldName.toLowerCase();
  if (lowercaseName.includes("date")) {
    return "date";
  }

  if (lowercaseName.includes("name")) {
    return "string";
  }

  return "unknown";
}

function isParseableNumber(value: string): boolean {
  return !isNaN(Number(value));
}

function isParseableDate(value: string): boolean {
  return !isNaN(Date.parse(value));
}

function detectFieldDataType(
  fieldName: string,
  values: readonly CSVCellValue[],
): DatasetField.DataType {
  const fallbackType = guessDataTypeFromFieldName(fieldName);
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
  const threshold = totalNonEmptyValues * THRESHOLD;
  if (dataTypeCounts.number > threshold) {
    return "number";
  }
  if (dataTypeCounts.string > threshold) {
    return "string";
  }
  if (dataTypeCounts.date > threshold) {
    return "date";
  }

  // if no clear majority, go with the fallback
  return fallbackType;
}

/**
 * Detects the data type of a field in a CSV dataset.
 * @param fieldName The name of the field to detect the data type for.
 * @param data The CSV data.
 * @returns The detected data type.
 */
export function detectFieldDataTypes(
  fieldNames: readonly string[],
  data: CSVData,
): readonly DatasetField.T[] {
  // Convert the CSV to a columnar format
  const columns = fieldNames.reduce(
    (obj, fieldName) => {
      obj[fieldName] = [];
      return obj;
    },
    {} as Record<string, CSVCellValue[]>,
  );

  // fill up the column arrays
  data.forEach((row) => {
    Object.keys(row).forEach((fieldName) => {
      columns[fieldName]?.push(row[fieldName]);
    });
  });

  return fieldNames.map((fieldName) => {
    const columnValues = columns[fieldName];

    return {
      id: uuid(),
      name: fieldName,
      dataType: detectFieldDataType(fieldName, columnValues ?? []),
      description: undefined,
    };
  });
}
