import { omit } from "@avandar/utils";
import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";
import type { ThemeDraft, ThemeEditScope } from "./ThemeDrafts";
/** Applies a replacement patch to the theme or item scope of a draft. */
export function applyScopedPatchToDraft(
  options: Readonly<{
    draft: ThemeDraft;
    scope: ThemeEditScope;
    patch: VideoThemePatch;
  }>,
): ThemeDraft {
  const { draft, scope, patch } = options;
  if (scope.kind === "theme") {
    return { ...draft, patch };
  }
  const others = omit(draft.overrides, scope.itemId);
  return {
    ...draft,
    overrides:
      Object.keys(patch).length === 0
        ? others
        : { ...others, [scope.itemId]: patch },
  };
}
