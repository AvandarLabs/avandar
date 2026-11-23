import type { LiveSourceRow } from "./LiveConnectorE2e.types";

const INITIAL_ROWS: readonly LiveSourceRow[] = [
  { region: "Coast", cases: 120, reportedOn: "2026-01-05" },
  { region: "Highlands", cases: 450, reportedOn: "2026-02-14" },
  { region: "Lakeside", cases: 275, reportedOn: "2026-03-30" },
];

function _makeCsvFromRows(rows: readonly LiveSourceRow[]): string {
  const lines = rows.map((row) => {
    return `${row.region},${row.cases},${row.reportedOn}`;
  });
  return ["region,cases,reported_on", ...lines].join("\r\n");
}

/**
 * The one small table every live connector spec reads: a text column, a
 * whole-number column and a date column, so a spec can tell a column typed
 * from its source apart from one left as text.
 */
export const LiveSourceTable = {
  /** The rows every live source holds when a spec starts. */
  initialRows: INITIAL_ROWS,

  /** The source after someone edited one row: Highlands' cases become 999. */
  rowsAfterEdit: INITIAL_ROWS.map((row) => {
    return row.region === "Highlands" ? { ...row, cases: 999 } : row;
  }),

  /**
   * The CSV a live source returns for `rows`: a header line, then one line
   * per row, with CRLF line endings because that is what both Google's
   * export and the Postgres connector's rows route send.
   */
  makeCsvFromRows: _makeCsvFromRows,
};
