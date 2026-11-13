import { mergeThemeOverrides, type MantineThemeOverride } from "@mantine/core";
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

function _toPatch(document: VideoThemeDocument): VideoThemePatch {
  return Object.fromEntries(
    Object.entries(document).filter(([key]) => !DOCUMENT_ONLY_KEYS.includes(key)),
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
        { path: "extends", message: `Theme "${themeId}" extends itself through "${currentId}"` },
      ]);
    }
    seen.add(currentId);
    const document = library.get(currentId);
    if (!document) {
      throw new VideoThemeError([{ path: "extends", message: `Unknown theme "${currentId}"` }]);
    }
    chain.unshift(document);
    currentId = document.extends;
  }
  return chain;
}

/**
 * Merges a theme into one sparse patch over Mantine's defaults, with
 * Mantine's `mergeThemeOverrides`: `classic`, then the `extends` chain from
 * its root, then the theme, then the theme's own override for each id in
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
    throw new VideoThemeError([{ path: "id", message: "The classic theme is missing" }]);
  }
  const chain = getExtendsChainFromThemeId(library, themeId);
  const theme = chain[chain.length - 1];
  const overrides = (scope.overrideIds ?? []).flatMap((id) => {
    const override = theme.overrides?.[id];
    return override ? [override] : [];
  });
  const layers: readonly VideoThemePatch[] = [
    ...[classic, ...chain.filter((document) => document !== classic)].map(_toPatch),
    ...overrides,
    ...(scope.patches ?? []),
  ];
  return mergeThemeOverrides(...(layers as MantineThemeOverride[])) as VideoThemePatch;
}
