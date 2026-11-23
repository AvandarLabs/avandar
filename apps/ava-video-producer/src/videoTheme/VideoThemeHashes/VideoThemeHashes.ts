function _sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(_sortValue);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => {
          return child !== undefined;
        })
        .sort(([left], [right]) => {
          return left < right ? -1 : left > right ? 1 : 0;
        })
        .map(([key, child]) => {
          return [key, _sortValue(child)];
        }),
    );
  }
  return value;
}
/**
 * JSON with object keys sorted at every depth and undefined values dropped,
 * so equal content always serializes the same way. Use it before hashing or
 * comparing theme content.
 */
function _makeCanonicalJsonFromValue(value: unknown): string {
  return JSON.stringify(_sortValue(value));
}
/** cyrb53: a fast, well-distributed 53-bit string hash. */
function _cyrb53({
  text,
  seed,
}: Readonly<{
  text: string;
  seed: number;
}>): number {
  let first = 0xdeadbeef ^ seed;
  let second = 0x41c6ce57 ^ seed;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 2654435761);
    second = Math.imul(second ^ code, 1597334677);
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507);
  first ^= Math.imul(second ^ (second >>> 13), 3266489909);
  second = Math.imul(second ^ (second >>> 16), 2246822507);
  second ^= Math.imul(first ^ (first >>> 13), 3266489909);
  return 4294967296 * (2097151 & second) + (first >>> 0);
}
/**
 * A synchronous content hash of resolved theme content, stable under key
 * order. The live player acknowledges a theme by this hash and exports
 * record it, so a preview and its MP4 can be matched. It is not a security
 * hash.
 */
function _fromContent(content: unknown): string {
  const text = _makeCanonicalJsonFromValue(content);
  return [
    _cyrb53({
      text,
      seed: 1,
    }),
    _cyrb53({
      text,
      seed: 2,
    }),
  ]
    .map((part) => {
      return part.toString(16).padStart(14, "0");
    })
    .join("");
}

/**
 * Hashes canonical theme content for change detection and render provenance.
 */
export const VideoThemeHashes = {
  /**
   * JSON with object keys sorted at every depth and undefined values dropped,
   * so equal content always serializes the same way.
   */
  makeCanonicalJsonFromValue: _makeCanonicalJsonFromValue,
  /**
   * A synchronous content hash of resolved theme content, stable under key
   * order.
   */
  fromContent: _fromContent,
};
