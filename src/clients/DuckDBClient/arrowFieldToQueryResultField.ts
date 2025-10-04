import * as arrow from "apache-arrow";
import { match } from "ts-pattern";
import { QueryResultColumn } from "./types";

export function arrowFieldToQueryResultField(
  field: arrow.Field<arrow.DataType>,
): QueryResultColumn {
  return {
    name: field.name,
    dataType: match(field.type.typeId)
      .with(arrow.Type.Date, arrow.Type.TimestampMillisecond, () => {
        return "date" as const;
      })
      .with(
        arrow.Type.Float,
        arrow.Type.Float16,
        arrow.Type.Float32,
        arrow.Type.Float64,
        arrow.Type.Int,
        arrow.Type.Int16,
        arrow.Type.Int32,
        arrow.Type.Int64,
        () => {
          return "number" as const;
        },
      )
      .otherwise(() => {
        return "text" as const;
      }),
  };
}
