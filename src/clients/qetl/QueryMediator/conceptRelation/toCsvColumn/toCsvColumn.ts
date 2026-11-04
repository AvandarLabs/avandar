import { toCsvRows } from "@/clients/qetl/QueryMediator/conceptRelation/toCsvRows/toCsvRows";

/**
 * Renders one column of values as RFC 4180 CSV text, with the quoting rules
 * of `toCsvRows`.
 */
export function toCsvColumn(
  columnName: string,
  values: readonly string[],
): string {
  return toCsvRows({
    columnNames: [columnName],
    rows: values.map((value) => {
      return [value];
    }),
  });
}
