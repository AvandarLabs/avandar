import { makeResolvedVideoThemeFromLibrary } from "../../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { mergeVideoThemeLayers } from "../../videoTheme/mergeVideoThemeLayers/mergeVideoThemeLayers";
import { VideoThemeError } from "../../videoTheme/VideoThemeError";
import { videoThemePatchSchema } from "../../videoTheme/VideoThemeSchemas/VideoThemeSchemas";
import { getTokenPathFromDocumentPath } from "../getTokenPathFromDocumentPath/getTokenPathFromDocumentPath";
import {
  type ThemeDraft,
  type ThemeEditScope,
  ThemeDrafts,
} from "../ThemeDrafts/ThemeDrafts";
import type {
  ResolvedVideoTheme,
  VideoThemeIssue,
  VideoThemeLibrary,
  VideoThemePatch,
} from "../../videoTheme/videoTheme.types";
/** What a draft resolves to in one scope, or every problem it has. */
export type DraftThemeResult =
  | Readonly<{
      ok: true;
      merged: VideoThemePatch;
      theme: ResolvedVideoTheme;
      patches: readonly VideoThemePatch[];
    }>
  | Readonly<{
      ok: false;
      merged: VideoThemePatch;
      issues: readonly VideoThemeIssue[];
    }>;
type DraftInput = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
}>;
function _schemaIssues(patches: readonly VideoThemePatch[]): VideoThemeIssue[] {
  return patches.flatMap((patch) => {
    const result = videoThemePatchSchema.safeParse(patch);
    return result.success
      ? []
      : result.error.issues.map((issue) => {
          return {
            path: getTokenPathFromDocumentPath(issue.path),
            message: issue.message,
          };
        });
  });
}
/**
 * Resolves a draft as one scope sees it, against the theme saving would
 * produce (see `makeDraftThemeTargetFromLibrary`): the theme with its draft, or
 * one
 * item with its draft on top. Reports schema and reference problems by
 * token path instead of throwing, so the editor can mark them.
 */
function _makeDraftThemeResultFromDraft(
  input: DraftInput &
    Readonly<{
      scope: ThemeEditScope;
    }>,
): DraftThemeResult {
  const itemId = input.scope.kind === "item" ? input.scope.itemId : undefined;
  const {
    library,
    themeId,
    scope = {},
  } = ThemeDrafts.toVideoThemeSource({ ...input, itemId });
  const patches = scope.patches ?? [];
  const merged = mergeVideoThemeLayers({
    library,
    themeId,
    scope,
  });
  const schemaIssues = _schemaIssues(patches);
  if (schemaIssues.length > 0) {
    return { ok: false, merged, issues: schemaIssues };
  }
  try {
    return {
      ok: true,
      merged,
      patches,
      theme: makeResolvedVideoThemeFromLibrary({
        library,
        themeId,
        scope,
      }),
    };
  } catch (error) {
    if (error instanceof VideoThemeError) {
      return { ok: false, merged, issues: error.issues };
    }
    throw error;
  }
}
/**
 * Whether every part of a draft resolves: the theme scope and each item it
 * overrides. Only a valid draft reaches previews and exports.
 */
function _isThemeDraftValid(input: DraftInput): boolean {
  return [
    { kind: "theme" } as const,
    ...Object.keys(input.draft.overrides).map((itemId) => {
      return { kind: "item", itemId } as const;
    }),
  ].every((scope) => {
    return _makeDraftThemeResultFromDraft({ ...input, scope }).ok;
  });
}
/**
 * The most recent draft of a theme that resolved, and the theme it belongs to.
 */
export type LastValidDraft = Readonly<{
  themeId: string;
  draft: ThemeDraft;
}>;
/**
 * The last valid draft after seeing the current one. A draft that does not
 * resolve changes nothing, and an unchanged valid draft returns `current`
 * itself so the caller can tell nothing moved.
 */
function _nextLastValidDraft(
  options: Readonly<{
    current: LastValidDraft | undefined;
    themeId: string;
    draft: ThemeDraft;
    isValid: boolean;
  }>,
): LastValidDraft | undefined {
  const { current, themeId, draft, isValid } = options;
  if (!isValid || (current?.themeId === themeId && current.draft === draft)) {
    return current;
  }
  return { themeId, draft };
}

/**
 * Validates scoped theme drafts and remembers the last valid editor preview.
 */
export const DraftThemeResolution = {
  /**
   * Resolves a draft as one scope sees it, against the theme saving would
   * produce (see `makeDraftThemeTargetFromLibrary`): the theme with its draft,
   * or one
   * item with its draft on top.
   */
  makeDraftThemeResultFromDraft: _makeDraftThemeResultFromDraft,
  /**
   * Whether every part of a draft resolves: the theme scope and each item it
   * overrides.
   */
  isThemeDraftValid: _isThemeDraftValid,
  /** The last valid draft after seeing the current one. */
  nextLastValidDraft: _nextLastValidDraft,
};
