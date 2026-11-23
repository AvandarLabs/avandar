import { omit } from "@avandar/utils";
import { VideoThemeError } from "../VideoThemeError";
import { getExtendsChainFromThemeId } from "./getExtendsChainFromThemeId/getExtendsChainFromThemeId";
import { mergeVideoThemePatches } from "./mergeVideoThemePatches/mergeVideoThemePatches";
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
  return omit(document, DOCUMENT_ONLY_KEYS);
}
/**
 * Merges a theme into one sparse patch. It follows Mantine's merge, except that
 * a value never merges into a non-object (a reference): the patch value
 * replaces it. Layers apply in this order: `classic`, then the `extends` chain
 * from its root, then the theme, then the theme's own override for each id in
 * `scope.overrideIds` in order, then `scope.patches`. Overrides declared by a
 * theme it extends are skipped: per-item art direction belongs to the theme
 * that declares it.
 */
export function mergeVideoThemeLayers({
  library,
  themeId,
  scope = {},
}: Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  scope?: VideoThemeScope;
}>): VideoThemePatch {
  const classic = library.get("classic");
  if (!classic) {
    throw new VideoThemeError([
      { path: "id", message: "The classic theme is missing" },
    ]);
  }
  const chain = getExtendsChainFromThemeId({
    library,
    themeId,
  });
  const theme = chain[chain.length - 1];
  const overrides = (scope.overrideIds ?? []).flatMap((id) => {
    const override = theme?.overrides?.[id];
    return override ? [override] : [];
  });
  const layers: readonly VideoThemePatch[] = [
    ...[
      classic,
      ...chain.filter((document) => {
        return document !== classic;
      }),
    ].map(_toPatch),
    ...overrides,
    ...(scope.patches ?? []),
  ];
  return mergeVideoThemePatches(...layers);
}
