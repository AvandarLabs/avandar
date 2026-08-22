import { objectValuesMap } from "@avandar/utils";
import * as arrow from "apache-arrow";
import { uuid } from "$/lib/uuid";
import { arrowFieldToQueryResultField } from "@/clients/DuckDbClient/arrowFieldToQueryResultField";
import { Logger } from "@/utils/Logger";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { ILogger } from "@avandar/logger";

function _toJsValueFromArrowValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value instanceof arrow.Vector) {
    return value.toArray().map((item: Readonly<{ toJSON: () => unknown }>) => {
      return item.toJSON();
    });
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const constructorName = (value as { constructor?: { name?: string } })
    .constructor?.name;
  if (constructorName !== "DecimalBigNum" && constructorName !== "BigNum") {
    return value;
  }
  const primitive = (value as { valueOf: () => unknown }).valueOf();
  return typeof primitive === "bigint" ? Number(primitive) : primitive;
}

/** Converts an Arrow table into a plain-JavaScript query result. */
export function arrowTableToJS<RowObject extends UnknownRow>(
  arrowTable: arrow.Table<Record<string, arrow.DataType>>,
  { logger = Logger }: { logger?: ILogger } = {},
): QueryResult.T<RowObject> {
  const jsDataRows = arrowTable.toArray().map((row): RowObject => {
    const jsRow = row.toJSON();
    return objectValuesMap(jsRow, _toJsValueFromArrowValue) as RowObject;
  });
  return {
    id: uuid(),
    columns: arrowTable.schema.fields.map((field) => {
      return arrowFieldToQueryResultField(field, { logger });
    }),
    data: jsDataRows,
    numRows: jsDataRows.length,
  };
}
