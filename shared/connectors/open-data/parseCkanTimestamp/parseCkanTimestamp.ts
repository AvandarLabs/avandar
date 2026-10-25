/**
 * A full ISO date-time: date, time to the second, an optional fraction, and
 * an optional `Z` or `+hh:mm` zone.
 */
const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(?<zone>Z|[+-]\d{2}:?\d{2})?$/;

/**
 * Reads a CKAN timestamp. CKAN writes `metadata_modified` as naive UTC with
 * microseconds (`2026-10-20T13:47:48.858245`), which `Date` would read as
 * local time, so a value with no zone is read as UTC. The fraction is cut,
 * not rounded, to milliseconds, which is also the precision CKAN's search
 * index keeps.
 *
 * @throws When the value is not a full ISO date-time.
 */
export function parseCkanTimestamp(value: string): Date {
  const match = ISO_DATE_TIME.exec(value);
  if (match !== null) {
    const truncated = value.replace(/(\.\d{3})\d+/, "$1");
    const date = new Date(
      match.groups?.zone === undefined ? `${truncated}Z` : truncated,
    );
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  throw new Error(`Not a CKAN timestamp: ${JSON.stringify(value)}.`);
}
