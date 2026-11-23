const PATTERN = /^[a-zA-Z0-9\u4E00-\u9FFF-]+$(?![\s\S])/;

/** The path-safe composition ID syntax accepted by the installed Remotion. */
export const CompositionIds = {
  /** The complete ID pattern, including Remotion's supported CJK range. */
  pattern: PATTERN,
  /** Rejects a composition ID before it can become an output path component. */
  assert(value) {
    if (!PATTERN.test(value))
      throw new Error(
        "Invalid composition ID. Use letters, digits, CJK characters or hyphens, without path separators.",
      );
  },
};
