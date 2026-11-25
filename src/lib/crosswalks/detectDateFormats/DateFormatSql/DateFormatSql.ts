import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { ColumnProfileSql } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";

/** The share of a column's non-blank sampled values one format must parse. */
const MIN_FORMAT_SHARE = 0.9;

/** The detect query's one row: counts keyed by column and format index. */
export type DateFormatCountsRow = Record<string, unknown>;

/**
 * One column's counts: its non-blank values, then how many each format
 * parses. Values are parsed as text exactly as a `parse_date` fill parses
 * them in the combined dataset.
 */
function _buildColumnParts(columnName: string, columnIndex: number): string[] {
  const text = `CAST(${quoteSqlIdentifier(columnName)} AS VARCHAR)`;
  const formatParts = ColumnProfileSql.DATE_FORMATS.map(
    (format, formatIndex) => {
      return `count(try_strptime(${text}, ${quoteSqlLiteral(format)})) AS "parsed_${columnIndex}_${formatIndex}"`;
    },
  );
  return [
    `count(NULLIF(${text}, '')) AS "values_${columnIndex}"`,
    ...formatParts,
  ];
}

function buildDetectSql(
  options: Readonly<{ relationName: string; columnNames: readonly string[] }>,
): string {
  const parts = options.columnNames.flatMap(_buildColumnParts);
  const sampleSql = ColumnProfileSql.buildDateSampleSql(
    quoteSqlIdentifier(options.relationName),
  );
  return `WITH "sample" AS (${sampleSql}) SELECT ${parts.join(", ")} FROM "sample"`;
}

function _toNumber(value: unknown): number {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return typeof value === "number" ? value : Number(value ?? 0);
}

function pickFormats(
  options: Readonly<{
    columnNames: readonly string[];
    row: DateFormatCountsRow;
  }>,
): Map<string, string> {
  const { row } = options;
  return new Map(
    options.columnNames.flatMap((columnName, columnIndex) => {
      const valueCount = _toNumber(row[`values_${columnIndex}`]);
      if (valueCount === 0) {
        return [];
      }
      const format = ColumnProfileSql.DATE_FORMATS.find((_, formatIndex) => {
        const parsedCount = _toNumber(
          row[`parsed_${columnIndex}_${formatIndex}`],
        );
        return parsedCount / valueCount >= MIN_FORMAT_SHARE;
      });
      return format ? [[columnName, format] as const] : [];
    }),
  );
}

/**
 * The DuckDB SQL that finds each text column's date format, and the step
 * that reads its one row. One query over a repeatable sample of the
 * relation, the same sample profiling's date share reads. Used by
 * `detectDateFormats`.
 */
export const DateFormatSql = {
  /** The share of non-blank values a format must parse to be chosen. */
  MIN_FORMAT_SHARE,

  /** One query counting, per column, the values each format parses. */
  buildDetectSql,

  /** Each column's first format reaching `MIN_FORMAT_SHARE`, by column name. */
  pickFormats,
};
