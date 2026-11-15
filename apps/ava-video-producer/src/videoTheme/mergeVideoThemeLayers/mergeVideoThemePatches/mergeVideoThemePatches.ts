import type { VideoThemePatch } from "../../videoTheme.types";

function _isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function _mergeTwoLayers(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(patch).map(([key, value]) => {
        const baseValue = base[key];
        return [
          key,
          _isPlainObject(value) && _isPlainObject(baseValue)
            ? _mergeTwoLayers(baseValue, value)
            : value,
        ];
      }),
    ),
  };
}

/**
 * Merges sparse theme patches, lowest precedence first, with the same rule
 * `mergeVideoThemeLayers` uses: objects merge, and any other value, such as
 * a reference, is replaced whole. Use it to fold several draft patches into
 * the one patch an export sends.
 */
export function mergeVideoThemePatches(
  ...layers: readonly VideoThemePatch[]
): VideoThemePatch {
  return layers.reduce<Record<string, unknown>>(
    (merged, layer) => _mergeTwoLayers(merged, layer),
    {},
  );
}
