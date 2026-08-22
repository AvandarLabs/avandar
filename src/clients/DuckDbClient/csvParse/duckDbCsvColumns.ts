import type { DuckDbSniffCsvRow } from "@/clients/DuckDbClient/csvParse/csvParse.types";

import {
  DuckDbDataType,
  DuckDbDataTypes,
} from "$/models/datasets/DatasetColumn/DuckDbDataTypes";

export function duckDbDataTypeFromString(typeString: string): DuckDbDataType {
  const normalizedType = typeString.toUpperCase() as DuckDbDataType;
  const isKnownType = DuckDbDataTypes.includes(normalizedType);
  if (isKnownType) {
    return normalizedType;
  }

  return "VARCHAR";
}

export function columnsFromSniffRow(
  columns: DuckDbSniffCsvRow["Columns"],
): Array<readonly [string, DuckDbDataType]> {
  return columns.map((column) => {
    return [column.name, duckDbDataTypeFromString(column.type)] as const;
  });
}
