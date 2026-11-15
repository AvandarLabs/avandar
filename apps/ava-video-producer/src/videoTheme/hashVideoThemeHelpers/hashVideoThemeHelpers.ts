function _sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(_sortValue);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, _sortValue(child)]),
    );
  }
  return value;
}

/**
 * JSON with object keys sorted at every depth and undefined values dropped,
 * so equal content always serializes the same way. Use it before hashing or
 * comparing theme content.
 */
export function buildCanonicalJsonFromValue(value: unknown): string {
  return JSON.stringify(_sortValue(value));
}

/** cyrb53: a fast, well-distributed 53-bit string hash. */
function _cyrb53(text: string, seed: number): number {
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
export function buildVideoThemeHashFromContent(content: unknown): string {
  const text = buildCanonicalJsonFromValue(content);
  return [_cyrb53(text, 1), _cyrb53(text, 2)]
    .map((part) => part.toString(16).padStart(14, "0"))
    .join("");
}
