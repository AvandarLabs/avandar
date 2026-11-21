import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_THEME_DRAFT,
  type ThemeDraft,
  type ThemeEditScope,
} from "../ThemeDrafts/ThemeDrafts";
import { DraftThemeResolution } from "./DraftThemeResolution";
import type {
  ResolvedVideoTheme,
  VideoThemeIssue,
  VideoThemeLibrary,
  VideoThemePatch,
} from "../../videoTheme/videoTheme.types";

/**
 * A draft as the editor shows it: current values, a theme to preview, and
 * problems.
 */
export type DraftTheme = Readonly<{
  merged: VideoThemePatch;
  theme: ResolvedVideoTheme;
  issues: readonly VideoThemeIssue[];
}>;

type Options = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
  scope: ThemeEditScope;
}>;
/** Returns the current theme or the last valid fallback for a draft preview. */
function _getDraftThemeFromResolution({
  result,
  fallback,
  themeId,
}: Readonly<{
  result: ReturnType<typeof DraftThemeResolution.makeDraftThemeResultFromDraft>;
  fallback: ResolvedVideoTheme | undefined;
  themeId: string;
}>): DraftTheme {
  if (result.ok) {
    return { merged: result.merged, theme: result.theme, issues: [] };
  }
  if (!fallback) {
    throw new Error(`The saved theme "${themeId}" does not resolve`);
  }
  return { merged: result.merged, theme: fallback, issues: result.issues };
}

/**
 * Resolves a draft for the editor. While the draft has problems it keeps the
 * last theme that resolved, so previews and swatches never go blank, and it
 * still returns the current values so a control shows what was typed.
 */
export function useDraftTheme({
  library,
  themeId,
  draft,
  scope,
}: Options): DraftTheme {
  const scopeKey = scope.kind === "item" ? scope.itemId : "";
  // Callers rebuild the scope object on every render; its key is what matters.
  const stableScope = useMemo<ThemeEditScope>(() => {
    return scopeKey ? { kind: "item", itemId: scopeKey } : { kind: "theme" };
  }, [scopeKey]);
  const result = useMemo(() => {
    return DraftThemeResolution.makeDraftThemeResultFromDraft({
      library,
      themeId,
      draft,
      scope: stableScope,
    });
  }, [library, themeId, draft, stableScope]);
  const saved = useMemo(() => {
    const unedited = DraftThemeResolution.makeDraftThemeResultFromDraft({
      library,
      themeId,
      draft: EMPTY_THEME_DRAFT,
      scope: stableScope,
    });
    return unedited.ok ? unedited.theme : undefined;
  }, [library, themeId, stableScope]);
  const [lastValid, setLastValid] =
    useState<Readonly<{ key: string; theme: ResolvedVideoTheme }>>();
  const key = `${themeId}:${scopeKey}`;
  useEffect(
    function rememberLastValidTheme() {
      if (result.ok) {
        setLastValid({ key, theme: result.theme });
      }
    },
    [result, key],
  );
  const fallback = lastValid?.key === key ? lastValid.theme : saved;
  return _getDraftThemeFromResolution({ result, fallback, themeId });
}
