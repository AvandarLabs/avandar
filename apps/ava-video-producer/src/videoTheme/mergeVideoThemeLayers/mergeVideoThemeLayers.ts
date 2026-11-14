import { VideoThemeError } from "../VideoThemeError/VideoThemeError";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
  VideoThemePatch,
  VideoThemeScope,
} from "../videoTheme.types";

const DOCUMENT_ONLY_KEYS: readonly string[] = [
  "$schema",
  "schemaVersion",
  "id",
  "label",
  "extends",
  "overrides",
];

function _isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function _mergeTwoLayers(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const baseValue = result[key];
    result[key] =
      _isPlainObject(value) && _isPlainObject(baseValue)
        ? _mergeTwoLayers(baseValue, value)
        : value;
  }
  return result;
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

function _toPatch(document: VideoThemeDocument): VideoThemePatch {
  return Object.fromEntries(
    Object.entries(document).filter(
      ([key]) => !DOCUMENT_ONLY_KEYS.includes(key),
    ),
  );
}

/**
 * A theme and every theme it extends, root first. Throws a
 * `VideoThemeError` for an unknown theme or an `extends` cycle. Use it to
 * know which documents a theme depends on, for example to snapshot them.
 */
export function getExtendsChainFromThemeId(
  library: VideoThemeLibrary,
  themeId: string,
): readonly VideoThemeDocument[] {
  const chain: VideoThemeDocument[] = [];
  const seen = new Set<string>();
  let currentId: string | undefined = themeId;
  while (currentId !== undefined) {
    if (seen.has(currentId)) {
      throw new VideoThemeError([
        {
          path: "extends",
          message: `Theme "${themeId}" extends itself through "${currentId}"`,
        },
      ]);
    }
    seen.add(currentId);
    const document = library.get(currentId);
    if (!document) {
      throw new VideoThemeError([
        { path: "extends", message: `Unknown theme "${currentId}"` },
      ]);
    }
    chain.unshift(document);
    currentId = document.extends;
  }
  return chain;
}

/**
 * Merges a theme into one sparse patch. It follows Mantine's merge, except
 * that a value never merges into a non-object (a reference): the patch value
 * replaces it. Layers apply in this order: `classic`, then the `extends`
 * chain from its root, then the theme, then the theme's own override for each id in
 * `scope.overrideIds` in order, then `scope.patches`. Overrides declared by
 * a theme it extends are skipped: per-item art direction belongs to the
 * theme that declares it.
 */
export function mergeVideoThemeLayers(
  library: VideoThemeLibrary,
  themeId: string,
  scope: VideoThemeScope = {},
): VideoThemePatch {
  const classic = library.get("classic");
  if (!classic) {
    throw new VideoThemeError([
      { path: "id", message: "The classic theme is missing" },
    ]);
  }
  const chain = getExtendsChainFromThemeId(library, themeId);
  const theme = chain[chain.length - 1];
  const overrides = (scope.overrideIds ?? []).flatMap((id) => {
    const override = theme?.overrides?.[id];
    return override ? [override] : [];
  });
  const layers: readonly VideoThemePatch[] = [
    ...[classic, ...chain.filter((document) => document !== classic)].map(
      _toPatch,
    ),
    ...overrides,
    ...(scope.patches ?? []),
  ];
  return mergeVideoThemePatches(...layers);
}
