const ARRAY_INDEX_PATTERN = /^\d+$/;

function _readSegment(current: unknown, segment: string): unknown {
  if (Array.isArray(current)) {
    return ARRAY_INDEX_PATTERN.test(segment)
      ? (current as readonly unknown[])[Number(segment)]
      : undefined;
  }
  if (typeof current === "object" && current !== null) {
    return Object.hasOwn(current, segment)
      ? (current as Readonly<Record<string, unknown>>)[segment]
      : undefined;
  }
  return undefined;
}

/**
 * Compiles a `from` path, such as `classification.domain_tags` or
 * `groups.0.title`, into a function that reads it from a source record. The
 * path is split once, here, not on every read. A numeric segment indexes an
 * array. A missing key, a path through `null` or a primitive, and an
 * inherited property all read as `undefined`.
 *
 * @param path - Dotted segments, already validated by the config parser.
 * @returns The reader.
 */
export function buildCatalogFieldPathReader(
  path: string,
): (record: unknown) => unknown {
  const segments = path.split(".");
  return (record) => {
    return segments.reduce<unknown>(_readSegment, record);
  };
}
