/**
 * Cache of constructed `Intl.DateTimeFormat` instances.
 *
 * Constructing a formatter costs far more than using one, and every
 * `formatDate` call needs several, so formatting a list of dates would
 * otherwise rebuild thousands of identical formatters. The key space is the
 * locales, zones, and field shapes a deployment actually uses, which is small;
 * the cap only guards against a caller feeding in unbounded zone strings.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/** Cache entries kept before the cache is dropped and rebuilt. */
const MAX_CACHED_FORMATTERS = 256;

/** A formatter for one locale, zone, and field shape, built at most once. */
export function getDateTimeFormatter(
  options: Readonly<{
    locale: string;
    intlTimeZone: string | undefined;
    shapeKey: string;
    fields: Intl.DateTimeFormatOptions;
  }>,
): Intl.DateTimeFormat {
  const { locale, intlTimeZone, shapeKey, fields } = options;
  const key = `${locale}|${intlTimeZone ?? "local"}|${shapeKey}`;
  const cached = formatterCache.get(key);
  if (cached) {
    return cached;
  }
  if (formatterCache.size >= MAX_CACHED_FORMATTERS) {
    formatterCache.clear();
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    ...(intlTimeZone === undefined ? {} : { timeZone: intlTimeZone }),
    ...fields,
  });
  formatterCache.set(key, formatter);
  return formatter;
}
