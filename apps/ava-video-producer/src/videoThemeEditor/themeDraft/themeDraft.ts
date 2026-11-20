import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import {
  createDraftThemeTarget,
  DRAFT_THEME_ID,
  type DraftThemeTarget,
} from "../../videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { getValueAtPath } from "../../videoTheme/getValueAtPath";
import { mergeVideoThemePatches } from "../../videoTheme/mergeVideoThemeLayers/mergeVideoThemePatches/mergeVideoThemePatches";
import { listTokenDefinitions } from "../../videoTheme/tokenCatalog/tokenCatalogHelpers/tokenCatalogHelpers";
import {
  createVideoThemeSnapshot,
  type VideoThemeSnapshot,
} from "../../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import { isCustomScaleEntryPath } from "../customScaleKey/customScaleKey";
import { getDocumentPathFromTokenPath } from "../getDocumentPathFromTokenPath/getDocumentPathFromTokenPath";
import { isRecord } from "../isRecord";
import { removeValueAtPath } from "../removeValueAtPath";
import { setValueAtPath } from "../setValueAtPath";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
  VideoThemePatch,
  VideoThemeSource,
} from "../../videoTheme/videoTheme.types";

/**
 * Unsaved edits to one theme: a sparse patch for the whole theme and one per
 * catalog item. The editor writes it, previews resolve it, and saving folds
 * it into the theme file.
 */
export type ThemeDraft = Readonly<{
  patch: VideoThemePatch;
  overrides: Readonly<Record<string, VideoThemePatch>>;
}>;

/** Whether an edit applies to the whole theme or to one item. */
export type ThemeEditScope =
  | Readonly<{ kind: "theme" }>
  | Readonly<{ kind: "item"; itemId: string }>;

/** The theme an export renders with: a saved theme id plus unsaved edits. */
export type ExportTheme = Readonly<{ id: string; patch?: VideoThemePatch }>;

/** A draft with no edits. */
export const EMPTY_THEME_DRAFT: ThemeDraft = { patch: {}, overrides: {} };

type DraftTarget = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
  itemId?: string;
}>;

function _getDocument(
  library: VideoThemeLibrary,
  themeId: string,
): VideoThemeDocument {
  const document = library.get(themeId);
  if (!document) {
    throw new Error(`Unknown theme "${themeId}"`);
  }
  return document;
}

function _scopePatch(
  options: Readonly<{ draft: ThemeDraft; scope: ThemeEditScope }>,
): VideoThemePatch {
  const { draft, scope } = options;
  return scope.kind === "theme"
    ? draft.patch
    : (draft.overrides[scope.itemId] ?? {});
}

function _withScopePatch(
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
  const others = Object.fromEntries(
    Object.entries(draft.overrides).filter(([itemId]) => {
      return itemId !== scope.itemId;
    }),
  );
  return {
    ...draft,
    overrides:
      Object.keys(patch).length === 0
        ? others
        : { ...others, [scope.itemId]: patch },
  };
}

/** A draft with one token set in a scope, replacing any earlier draft value. */
export function setTokenInDraft(
  options: Readonly<{
    draft: ThemeDraft;
    scope: ThemeEditScope;
    tokenPath: string;
    value: unknown;
  }>,
): ThemeDraft {
  const { draft, scope, tokenPath, value } = options;
  const patch = setValueAtPath({
    source: _scopePatch({ draft, scope }),
    path: getDocumentPathFromTokenPath(tokenPath),
    value,
  });
  return _withScopePatch({ draft, scope, patch });
}

/** A draft with one token's draft value removed from a scope. */
export function resetTokenInDraft(
  options: Readonly<{
    draft: ThemeDraft;
    scope: ThemeEditScope;
    tokenPath: string;
  }>,
): ThemeDraft {
  const { draft, scope, tokenPath } = options;
  const patch = removeValueAtPath({
    source: _scopePatch({ draft, scope }),
    path: getDocumentPathFromTokenPath(tokenPath),
  });
  return _withScopePatch({ draft, scope, patch });
}

/** Whether a draft holds any edit. */
export function isThemeDraftEmpty(draft: ThemeDraft): boolean {
  return (
    Object.keys(draft.patch).length === 0 &&
    Object.keys(draft.overrides).length === 0
  );
}

/**
 * The token paths a patch sets, one per scale entry, such as
 * `atomic.swatch.mint`. Use it to count overrides or apply a patch token by
 * token.
 */
export function listTokenPathsFromPatch(
  patch: VideoThemePatch,
): readonly string[] {
  return listTokenDefinitions().flatMap(({ path, isScale }) => {
    const value = getValueAtPath(patch, getDocumentPathFromTokenPath(path));
    if (value === undefined) {
      return [];
    }
    return isScale && isRecord(value)
      ? Object.keys(value).map((key) => {
          return `${path}.${key}`;
        })
      : [path];
  });
}

function _draftTarget(target: DraftTarget): DraftThemeTarget {
  return createDraftThemeTarget({
    library: target.library,
    themeId: target.themeId,
    hasDraft: !isThemeDraftEmpty(target.draft),
  });
}

/**
 * How many tokens an item overrides, saved or drafted, one per token the
 * producer changed. A custom value's generated scale entry is not counted
 * apart from the token that points at it. On a built-in theme
 * with a draft the saved overrides do not count: the new theme saving would
 * create does not inherit them.
 */
export function countItemOverrides(
  target: DraftTarget & Readonly<{ itemId: string }>,
): number {
  const themeTarget = _draftTarget(target);
  const saved =
    _getDocument(themeTarget.library, themeTarget.themeId).overrides?.[
      target.itemId
    ] ?? {};
  return new Set(
    [
      ...listTokenPathsFromPatch(saved),
      ...listTokenPathsFromPatch(target.draft.overrides[target.itemId] ?? {}),
    ].filter((tokenPath) => {
      return !isCustomScaleEntryPath(tokenPath);
    }),
  ).size;
}

function _applyPatch(
  target: VideoThemePatch,
  patch: VideoThemePatch,
): VideoThemePatch {
  return listTokenPathsFromPatch(patch).reduce((result, tokenPath) => {
    const documentPath = getDocumentPathFromTokenPath(tokenPath);
    return setValueAtPath({
      source: result,
      path: documentPath,
      value: getValueAtPath(patch, documentPath),
    });
  }, target);
}

/**
 * The theme file a save writes: each draft token set whole, theme edits at
 * the theme level and item edits into `overrides`.
 */
export function createSavedDocumentFromDraft(
  document: VideoThemeDocument,
  draft: ThemeDraft,
): VideoThemeDocument {
  const overrides = {
    ...document.overrides,
    ...Object.fromEntries(
      Object.entries(draft.overrides).map(([itemId, patch]) => {
        return [itemId, _applyPatch(document.overrides?.[itemId] ?? {}, patch)];
      }),
    ),
  };
  return {
    ..._applyPatch(document, draft.patch),
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
  } as VideoThemeDocument;
}

/**
 * A new theme holding a draft. From a built-in it is a sparse theme that
 * extends the built-in (whose per-item overrides it does not inherit); from
 * a custom theme it is a full copy with the draft folded in.
 */
export function createNewThemeDocument(
  options: Readonly<{
    base: VideoThemeDocument;
    draft: ThemeDraft;
    id: string;
    label: string;
  }>,
): VideoThemeDocument {
  const { base, draft, id, label } = options;
  if (!BUILT_IN_VIDEO_THEMES.has(base.id)) {
    return { ...createSavedDocumentFromDraft(base, draft), id, label };
  }
  const overrides = Object.fromEntries(
    Object.entries(draft.overrides).map(([itemId, patch]) => {
      return [itemId, _applyPatch({}, patch)];
    }),
  );
  return {
    schemaVersion: 1,
    id,
    label,
    extends: base.id,
    ..._applyPatch({}, draft.patch),
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
  };
}

/**
 * The unsaved patches one item renders with, lowest first: the theme draft,
 * then the item's draft. Tokens that the draft target's own saved override
 * for the item sets are left out of the theme draft, because once saved
 * those overrides outrank theme values. A built-in theme's draft targets an
 * unsaved theme with no overrides (see `createDraftThemeTarget`), so nothing
 * is left out there.
 */
export function createDraftPatchesForItem(
  target: DraftTarget,
): readonly VideoThemePatch[] {
  const { draft, itemId } = target;
  const themeTarget = _draftTarget(target);
  const saved =
    itemId === undefined
      ? {}
      : (_getDocument(themeTarget.library, themeTarget.themeId).overrides?.[
          itemId
        ] ?? {});
  const themePatch = listTokenPathsFromPatch(saved).reduce(
    (patch, tokenPath) => {
      return removeValueAtPath({
        source: patch,
        path: getDocumentPathFromTokenPath(tokenPath),
      });
    },
    draft.patch,
  );
  const itemPatch = itemId === undefined ? {} : (draft.overrides[itemId] ?? {});
  return [themePatch, itemPatch].filter((patch) => {
    return Object.keys(patch).length > 0;
  });
}

/**
 * Everything needed to resolve a draft for one item, or for the whole theme
 * when no item is given: the draft target's library and theme, the item's
 * override id, and its draft patches. The editor, previews, snapshots, and
 * exports all start here, so they resolve the same theme and hash.
 */
export function createVideoThemeSourceFromDraft(
  target: DraftTarget,
): VideoThemeSource {
  const themeTarget = _draftTarget(target);
  return {
    library: themeTarget.library,
    themeId: themeTarget.themeId,
    scope: {
      overrideIds: target.itemId === undefined ? [] : [target.itemId],
      patches: createDraftPatchesForItem(target),
    },
  };
}

/**
 * What the live player needs to render an item with the draft: the draft
 * target's custom documents (built-ins come from its bundle; a built-in's
 * draft brings its unsaved theme) and the item's draft patches.
 */
export function createSnapshotFromDraft(
  target: DraftTarget,
): VideoThemeSnapshot {
  const themeTarget = _draftTarget(target);
  return createVideoThemeSnapshot(
    themeTarget.library,
    themeTarget.themeId,
    createDraftPatchesForItem(target),
  );
}

/**
 * The `theme` an export request sends for one item: the saved id and one
 * merged patch. A present `patch`, even an empty one, tells the server a
 * draft exists, so it applies the same draft target (see
 * `createSnapshotFromThemeRequest`) and the MP4 matches the preview. A
 * built-in theme with edits only on other items still resolves as the
 * unsaved theme, so its export carries `patch: {}`. Only a theme with no
 * draft at all sends the id alone.
 */
export function createExportThemeFromDraft(target: DraftTarget): ExportTheme {
  if (isThemeDraftEmpty(target.draft)) {
    return { id: target.themeId };
  }
  return {
    id: target.themeId,
    patch: mergeVideoThemePatches(...createDraftPatchesForItem(target)),
  };
}

/**
 * A theme id made from a label: a slug, with a number added when taken or
 * when it would be the reserved `DRAFT_THEME_ID`.
 */
export function buildThemeIdFromLabel(
  label: string,
  takenIds: readonly string[],
): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "theme";
  let id = base;
  for (
    let suffix = 2;
    takenIds.includes(id) || id === DRAFT_THEME_ID;
    suffix += 1
  ) {
    id = `${base}-${suffix}`;
  }
  return id;
}
