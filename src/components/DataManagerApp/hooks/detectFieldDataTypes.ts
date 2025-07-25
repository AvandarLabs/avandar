import { RawCellValue, RawDataset } from "@/lib/types/common";
import { uuid } from "@/lib/utils/uuid";
import type {
  FieldDataType,
  LocalDatasetField,
} from "@/models/LocalDataset/LocalDatasetField/types";

function guessDataTypeFromFieldName(fieldName: string): FieldDataType {
  const lowercaseName = fieldName.toLowerCase();
  if (lowercaseName.includes("date")) {
    return "date";
  }

  if (lowercaseName.includes("name")) {
    return "string";
  }

  return "string";
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

function detectFieldDataType(
  fieldName: string,
  values: readonly RawCellValue[],
): FieldDataType {
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
  if (dataTypeCounts.number === totalNonEmptyValues) {
    return "number";
  }
  if (dataTypeCounts.string === totalNonEmptyValues) {
    return "string";
  }
  if (dataTypeCounts.date === totalNonEmptyValues) {
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
  data: RawDataset,
): LocalDatasetField[] {
  // Convert the CSV to a columnar format
  const columns = fieldNames.reduce(
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
