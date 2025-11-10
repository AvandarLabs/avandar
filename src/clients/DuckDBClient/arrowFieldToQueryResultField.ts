import * as arrow from "apache-arrow";
import { match } from "ts-pattern";
import { QueryResultColumn } from "@/models/queries/QueryResult/QueryResult.types";
import { constant } from "@/lib/utils/higherOrderFuncs";
import { ILogger, Logger } from "@/lib/Logger";

export function arrowFieldToQueryResultField(
  field: arrow.Field<arrow.DataType>,
  { logger = Logger }: { logger?: ILogger } = {},
): QueryResultColumn {
  return {
    name: field.name,
    dataType: match(field.type.typeId)
      .with(
        arrow.Type.Date,
        arrow.Type.DateDay,
        arrow.Type.DateMillisecond,
        constant("date" as const),
      ).with(
        arrow.Type.Time,
        arrow.Type.TimeSecond,
        arrow.Type.TimeMillisecond,
        arrow.Type.TimeMicrosecond,
        arrow.Type.TimeNanosecond,
        constant("time" as const),
      ).with(
        arrow.Type.Timestamp,
        arrow.Type.TimestampSecond,
        arrow.Type.TimestampMillisecond,
        arrow.Type.TimestampMicrosecond,
        arrow.Type.TimestampNanosecond,
        constant("timestamp" as const),
      )
      .with(
        arrow.Type.Float,
        arrow.Type.Float16,
        arrow.Type.Float32,
        arrow.Type.Float64,
        arrow.Type.Decimal,
        constant("double" as const),
      )
      .with(
        arrow.Type.Int,
        arrow.Type.Int8,
        arrow.Type.Int16,
        arrow.Type.Int32,
        arrow.Type.Int64,
        arrow.Type.Uint8,
        arrow.Type.Uint16,
        arrow.Type.Uint32,
        arrow.Type.Uint64,
        () => {
          return "bigint" as const;
        },
      )
      .with(
        arrow.Type.Bool,
        constant("boolean" as const),
      )
      .with(
        arrow.Type.Utf8,
        arrow.Type.LargeUtf8,
        constant("varchar" as const),
      )
      .with(
        arrow.Type.NONE,
        arrow.Type.Null,
        arrow.Type.Binary,
        arrow.Type.Interval,
        arrow.Type.List,
        arrow.Type.Struct,
        arrow.Type.Union,
        arrow.Type.FixedSizeBinary,
        arrow.Type.FixedSizeList,
        arrow.Type.Map,
        arrow.Type.Duration,
        arrow.Type.LargeBinary,
        arrow.Type.Dictionary,
        arrow.Type.DenseUnion,
        arrow.Type.SparseUnion,
        arrow.Type.IntervalDayTime,
        arrow.Type.IntervalYearMonth,
        arrow.Type.DurationSecond,
        arrow.Type.DurationMillisecond,
        arrow.Type.DurationMicrosecond,
        arrow.Type.DurationNanosecond,
        (typeId) => {
          logger.error(`Unhandleable arrow type`, { typeId });
          return "varchar" as const;
        },
      )
      .otherwise((typeId) => {
        logger.error(`Unknown arrow type`, { typeId });
        return "varchar" as const;
      }),
  };
}
