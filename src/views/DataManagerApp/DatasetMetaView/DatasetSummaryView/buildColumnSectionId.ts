/**
 * The DOM id of one column's summary section.
 *
 * The outline in the rail and the sections in the content column both derive
 * it from the column name, so anchor navigation cannot drift out of step with
 * what it points at.
 */
export function buildColumnSectionId(columnName: string): string {
  return `col-${encodeURIComponent(columnName)}`;
}
