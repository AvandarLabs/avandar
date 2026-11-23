const ARRAY_INDEX_PATTERN = /^\d+$/;

function _isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function _isEmptyObject(value: unknown): boolean {
  return _isPlainObject(value) && Object.keys(value).length === 0;
}

/** Removes one path's last segment, rebuilding only what lies on the path. */
function _omitSegments(value: unknown, segments: readonly string[]): unknown {
  const [segment, ...rest] = segments;
  if (segment === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    if (!ARRAY_INDEX_PATTERN.test(segment) || rest.length === 0) {
      return value;
    }
    const index = Number(segment);
    return index < value.length
      ? value.map((entry: unknown, entryIndex) => {
          return entryIndex === index ? _omitSegments(entry, rest) : entry;
        })
      : value;
  }
  if (!_isPlainObject(value) || !Object.hasOwn(value, segment)) {
    return value;
  }
  const { [segment]: child, ...others } = value;
  if (rest.length === 0) {
    return others;
  }
  const omittedChild = _omitSegments(child, rest);
  return _isEmptyObject(omittedChild)
    ? others
    : { ...others, [segment]: omittedChild };
}

/**
 * A copy of a source record without the given dotted paths, read the way a
 * `from` path reads them: a numeric segment indexes an array, and a path that
 * is missing or runs through a primitive removes nothing. An object left
 * with no keys is removed from its parent. The record itself is not changed.
 *
 * @param record - The source record. Anything but an object or array is
 *   returned as it is.
 * @param paths - Dotted paths, such as `notes` or `organization.title`.
 * @returns The record without those paths.
 */
export function omitRecordPaths(
  record: unknown,
  paths: readonly string[],
): unknown {
  return paths.reduce<unknown>((current, path) => {
    return _omitSegments(current, path.split("."));
  }, record);
}
