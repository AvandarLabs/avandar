import { mergeVideoThemeLayers } from "../../videoTheme/mergeVideoThemeLayers/mergeVideoThemeLayers";
import { resolveVideoTheme } from "../../videoTheme/resolveVideoTheme/resolveVideoTheme";
import { VideoThemeError } from "../../videoTheme/VideoThemeError/VideoThemeError";
import { videoThemePatchSchema } from "../../videoTheme/videoThemeSchema/videoThemeSchema";
import {
  createVideoThemeSourceFromDraft,
  getTokenPathFromDocumentPath,
  type ThemeDraft,
  type ThemeEditScope,
} from "../themeDraft/themeDraft";
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
      : result.error.issues.map((issue) => ({
          path: getTokenPathFromDocumentPath(issue.path),
          message: issue.message,
        }));
  });
}

/**
 * Resolves a draft as one scope sees it, against the theme saving would
 * produce (see `createDraftThemeTarget`): the theme with its draft, or one
 * item with its draft on top. Reports schema and reference problems by
 * token path instead of throwing, so the editor can mark them.
 */
export function resolveDraftTheme(
  input: DraftInput & Readonly<{ scope: ThemeEditScope }>,
): DraftThemeResult {
  const itemId = input.scope.kind === "item" ? input.scope.itemId : undefined;
  const {
    library,
    themeId,
    scope = {},
  } = createVideoThemeSourceFromDraft({ ...input, itemId });
  const patches = scope.patches ?? [];
  const merged = mergeVideoThemeLayers(library, themeId, scope);
  const schemaIssues = _schemaIssues(patches);
  if (schemaIssues.length > 0) {
    return { ok: false, merged, issues: schemaIssues };
  }
  try {
    return {
      ok: true,
      merged,
      patches,
      theme: resolveVideoTheme(library, themeId, scope),
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
export function isThemeDraftValid(input: DraftInput): boolean {
  return [
    { kind: "theme" } as const,
    ...Object.keys(input.draft.overrides).map(
      (itemId) => ({ kind: "item", itemId }) as const,
    ),
  ].every((scope) => resolveDraftTheme({ ...input, scope }).ok);
}
