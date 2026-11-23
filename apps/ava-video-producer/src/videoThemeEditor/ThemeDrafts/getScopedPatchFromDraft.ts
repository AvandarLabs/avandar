import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";
import type { ThemeDraft, ThemeEditScope } from "./ThemeDrafts";
/** The patch in a draft selected by the theme or item scope. */
export function getScopedPatchFromDraft(
  options: Readonly<{
    draft: ThemeDraft;
    scope: ThemeEditScope;
  }>,
): VideoThemePatch {
  const { draft, scope } = options;
  return scope.kind === "theme"
    ? draft.patch
    : (draft.overrides[scope.itemId] ?? {});
}
