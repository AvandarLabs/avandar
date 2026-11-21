/** Every generated custom scale key starts with this word. */
export const CUSTOM_SCALE_KEY_PREFIX = "custom";

/**
 * Whether a scale key was generated for a custom value, such as
 * `customColorAccent`. The word must be followed by a capital, so authored
 * keys that merely start with "custom" do not match.
 */
function _isCustomScaleKey(key: string | undefined): boolean {
  return (
    key !== undefined &&
    new RegExp(`^${CUSTOM_SCALE_KEY_PREFIX}[A-Z]`).test(key)
  );
}

/**
 * Whether a token path is a scale entry holding a custom value, such as
 * `atomic.swatch.customColorAccent`. A semantic token points at it, so it is
 * an implementation detail of that token's edit, not an edit of its own.
 */
function _isCustomScaleEntryPath(tokenPath: string): boolean {
  const segments = tokenPath.split(".");
  return segments.length >= 2 && _isCustomScaleKey(segments.at(-1));
}

/**
 * A camelCase scale key as lowercase words, such as `text dark` for `textDark`.
 */
function _humanizeScaleKey(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

/** Recognizes and labels custom scale entries in the video theme editor. */
export const CustomScaleKeys = {
  /**
   * Whether a scale key was generated for a custom value, such as
   * `customColorAccent`.
   */
  isCustomScaleKey: _isCustomScaleKey,
  /**
   * Whether a token path is a scale entry holding a custom value, such as
   * `atomic.swatch.customColorAccent`.
   */
  isCustomScaleEntryPath: _isCustomScaleEntryPath,
  /**
   * A camelCase scale key as lowercase words, such as `text dark` for
   * `textDark`.
   */
  humanizeScaleKey: _humanizeScaleKey,
};
