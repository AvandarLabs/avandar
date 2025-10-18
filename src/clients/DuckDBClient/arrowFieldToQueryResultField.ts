import * as arrow from "apache-arrow";
import { match } from "ts-pattern";
import { QueryResultColumn } from "./types";
import { constant } from "@/lib/utils/higherOrderFuncs";

export function arrowFieldToQueryResultField(
  field: arrow.Field<arrow.DataType>,
): QueryResultColumn {
  return {
    name: field.name,
    dataType: match(field.type.typeId)
      .with(
        arrow.Type.Date,
        constant("date" as const),
      ).with(
        arrow.Type.TimestampMillisecond,
        constant("timestamp" as const),
      )
      .with(
        arrow.Type.Float,
        arrow.Type.Float16,
        arrow.Type.Float32,
        arrow.Type.Float64,
        constant("double" as const),
      )
      .with(
        arrow.Type.Int,
        arrow.Type.Int16,
        arrow.Type.Int32,
        arrow.Type.Int64,
        () => {
          return "bigint" as const;
        },
      )
      .with(
        arrow.Type.Bool,
        constant("boolean" as const),
      )
      .otherwise(() => {
        return "varchar" as const;
      }),
  };
}
