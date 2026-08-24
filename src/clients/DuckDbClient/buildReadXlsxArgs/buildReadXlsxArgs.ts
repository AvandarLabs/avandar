import { escapeSqlSingleQuotedLiteral } from "@/clients/DuckDbClient/duckDbSqlText";

export type ReadXlsxArgsOptions = {
  /** When true, the first row of the range supplies the column names. */
  hasHeader: boolean;

  /** Worksheet name. Omit for the first sheet, which is DuckDB's default. */
  sheet?: string;

  /** Cell range, e.g. `A4:D1048576`. Omit to read from the first cell. */
  range?: string;
};

/**
 * Builds the argument list for a `read_xlsx(...)` call.
 *
 * Split out from the query text so the reader's behavior under these arguments
 * can be executed against a real DuckDB in a test, which is the only way to
 * cover them: the bugs they exist to prevent are type-inference behaviors of
 * the reader, and an assertion on the argument string would pass whether or not
 * DuckDB honored it.
 *
 * **`all_varchar` is unconditional and not an option.** Left to infer, DuckDB
 * types each column from a sample of leading rows and then fails the *entire*
 * read on the first cell that does not fit, so a column of numbers that turns
 * into prose a few hundred rows down aborts the import with
 * `Could not convert string '...' to DOUBLE`. That is the worst possible
 * moment for it: the sniff phase is SheetJS rather than DuckDB, so it reads the
 * same workbook happily and the user has already been told the preview parsed.
 * Reading everything as text also agrees with the schema the import actually
 * records, since both xlsx callers write `column_type: "VARCHAR"` for every
 * sniffed column.
 *
 * @param options The header, sheet and range to read.
 * @returns The comma-separated arguments, ready to follow the file argument.
 */
export function buildReadXlsxArgs(
  options: Readonly<ReadXlsxArgsOptions>,
): string {
  const args = [
    `header = ${options.hasHeader}`,
    "all_varchar = true",
    options.sheet === undefined ?
      ""
    : `sheet = '${escapeSqlSingleQuotedLiteral(options.sheet)}'`,
    options.range === undefined ? "" : `range = '${options.range}'`,
    // Naming a range turns `stop_at_empty` off, which would pad the read out to
    // the format's maximum row, so it is switched back on alongside the range.
    options.range === undefined ? "" : "stop_at_empty = true",
  ];
  return args
    .filter((arg) => {
      return arg.length > 0;
    })
    .join(", ");
}
