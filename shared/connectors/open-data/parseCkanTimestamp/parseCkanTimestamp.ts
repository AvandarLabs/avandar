/** A trailing `Z` or `+hh:mm` offset. */
const ZONE_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/;

/**
 * Reads a CKAN timestamp. CKAN writes `metadata_modified` as naive UTC with
 * microseconds (`2026-10-20T13:47:48.858245`), which `Date` would read as
 * local time, so a value with no zone is read as UTC. The fraction is cut to
 * milliseconds, which is also the precision CKAN's search index keeps.
 *
 * @throws When the value is not a timestamp.
 */
export function parseCkanTimestamp(value: string): Date {
  const milliseconds = value.replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(
    ZONE_SUFFIX.test(milliseconds) ? milliseconds : `${milliseconds}Z`,
  );
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Not a CKAN timestamp: ${JSON.stringify(value)}.`);
  }
  return date;
}
