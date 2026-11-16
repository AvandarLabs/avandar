import type { CatalogFieldScriptContext } from "@avandar/etl";

/**
 * HDX's `dataset_date`: a Solr range, `[start TO end]`, whose bounds carry no
 * timezone, and whose end is `*` while the data is still being added to.
 */
const DATASET_DATE_PATTERN = /^\[(\S+) TO (\S+)\]$/;

const OPEN_BOUND = "*";

/** Which capture group of `DATASET_DATE_PATTERN` each coverage field reads. */
const BOUND_GROUP_BY_FIELD: Readonly<Record<string, number>> = {
  coverage_start_date: 1,
  coverage_end_date: 2,
};

/**
 * The source record paths this field holds, left out of a listing's additional
 * source metadata. The `dataset_date` range both coverage fields are read from.
 */
export const reads = ["dataset_date"];

/**
 * Mapper script for `coverage_start_date` and `coverage_end_date`: the
 * matching end of the package's date range. HDX writes its bounds in UTC
 * without saying so, so each is marked as UTC. An open end (`*`) or a date
 * that is not a range maps to nothing.
 */
export default function hdxCoverageDate(
  record: unknown,
  context: CatalogFieldScriptContext,
): string | undefined {
  const datasetDate = (record as { dataset_date?: unknown } | null)
    ?.dataset_date;
  if (typeof datasetDate !== "string") {
    return undefined;
  }
  const boundGroup = Object.hasOwn(BOUND_GROUP_BY_FIELD, context.field)
    ? BOUND_GROUP_BY_FIELD[context.field]
    : undefined;
  if (boundGroup === undefined) {
    return undefined;
  }
  const bound = DATASET_DATE_PATTERN.exec(datasetDate.trim())?.[boundGroup];
  return bound === undefined || bound === OPEN_BOUND ? undefined : `${bound}Z`;
}
