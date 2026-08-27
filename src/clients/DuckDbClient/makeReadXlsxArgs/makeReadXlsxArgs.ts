import { escapeSqlSingleQuotedLiteral } from "@/clients/DuckDbClient/duckDbSqlText";

export type ReadXlsxArgsOptions = {
  /** When true, the first row of the range supplies the column names. */
  hasHeader: boolean;

  /** Worksheet name. Omit for the first sheet, which is DuckDB's default. */
  sheet?: string;

  /** Cell range, e.g. `A4:D1048576`. Omit to read from the first cell. */
  range?: string;

  /**
   * Whether to stop at the first empty row. Defaults to true.
   *
   * Always emitted rather than left to DuckDB, whose own default flips with the
   * range: on without one, off with one, which would pad a ranged read out to
   * the format's maximum row. Pass false for a probe that must see past a gap.
   */
  stopAtEmpty?: boolean;
};

/**
 * Makes the argument list for a `read_xlsx(...)` call.
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
 * @param options The header, sheet, range and empty-row handling to read with.
 * @returns The comma-separated arguments, ready to follow the file argument.
 */
export function makeReadXlsxArgs(
  options: Readonly<ReadXlsxArgsOptions>,
): string {
  const stopAtEmpty = options.stopAtEmpty ?? true;
  const args = [
    `header = ${options.hasHeader}`,
    "all_varchar = true",
    options.sheet === undefined ?
      ""
    : `sheet = '${escapeSqlSingleQuotedLiteral(options.sheet)}'`,
    options.range === undefined ? "" : `range = '${options.range}'`,
    `stop_at_empty = ${stopAtEmpty}`,
  ];
  return args
    .filter((arg) => {
      return arg.length > 0;
    })
    .join(", ");
}
