/**
 * Serialises an extracted PDF table to CSV text so DuckDB's existing
 * `sniff_csv` can decide the column types.
 *
 * Writing our own type inference would mean maintaining a second engine that
 * slowly drifts from the one CSV import uses, so that the same number
 * imported two ways ends up with two different types. Round-tripping through
 * CSV costs one serialise and buys inference that is already correct.
 */
function _escapeCsvValue(value: string): string {
  if (!/[",\n]/u.test(value)) {
    return value;
  }
  return `"${value.replace(/"/gu, '""')}"`;
}

/**
 * Flattens however many header rows into one name per column.
 *
 * A spanning header writes the year once above four quarter columns, so the
 * bottom row alone would give four columns called Q1, Q2, Q1, Q2 with the
 * year lost entirely. Joining the stack preserves it.
 */
function _buildColumnNames(
  headerRows: ReadonlyArray<readonly string[]>,
  columnCount: number,
): string[] {
  const names = Array.from({ length: columnCount }, (_, columnIndex) => {
    const parts = headerRows
      .map((row) => {
        return row[columnIndex] ?? "";
      })
      .filter((part) => {
        return part !== "";
      });

    // A spanning header repeats its value across the columns it covers, so
    // strip consecutive duplicates before joining.
    const deduped = parts.filter((part, index) => {
      return part !== parts[index - 1];
    });

    const joined = deduped.join(" ").trim();
    return joined === "" ? `column_${columnIndex + 1}` : joined;
  });

  // Disambiguate duplicates. Two columns with the same name is not
  // representable in a dataset schema.
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    return count === 0 ? name : `${name}_${count + 1}`;
  });
}

/** Serialises the table, header included, as CSV text. */
export function pdfTableToCsv(table: {
  cells: ReadonlyArray<readonly string[]>;
  headerRows: number;
}): string {
  const columnCount = table.cells[0]?.length ?? 0;
  const headerRows = table.cells.slice(0, table.headerRows);
  const dataRows = table.cells.slice(table.headerRows);

  const columnNames = _buildColumnNames(headerRows, columnCount);

  const lines = [
    columnNames.map(_escapeCsvValue).join(","),
    ...dataRows.map((row) => {
      return Array.from({ length: columnCount }, (_, i) => {
        return _escapeCsvValue(row[i] ?? "");
      }).join(",");
    }),
  ];

  return lines.join("\n");
}
