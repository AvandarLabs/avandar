import { makeObjectFromEntries } from "@avandar/utils";
import { getValueAtPath } from "../../videoTheme/getValueAtPath";
import {
  makeDraftThemeTargetFromLibrary,
  DRAFT_THEME_ID,
  type DraftThemeTarget,
} from "../../videoTheme/makeDraftThemeTargetFromLibrary/makeDraftThemeTargetFromLibrary";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { mergeVideoThemePatches } from "../../videoTheme/mergeVideoThemeLayers/mergeVideoThemePatches/mergeVideoThemePatches";
import { TokenCatalog } from "../../videoTheme/tokenCatalog/TokenCatalog/TokenCatalog";
import {
  type VideoThemeSnapshot,
  VideoThemeSnapshots,
} from "../../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import { CustomScaleKeys } from "../CustomScaleKeys/CustomScaleKeys";
import { getDocumentPathFromTokenPath } from "../getDocumentPathFromTokenPath/getDocumentPathFromTokenPath";
import { isRecord } from "../isRecord";
import { removeValueAtPath } from "../removeValueAtPath";
import { setValueAtPath } from "../setValueAtPath";
import { applyPatchToTheme as _applyPatch } from "./applyPatchToTheme";
import { applyScopedPatchToDraft as _withScopePatch } from "./applyScopedPatchToDraft";
import { getScopedPatchFromDraft } from "./getScopedPatchFromDraft";
import { getThemeDocumentFromLibrary as _getDocument } from "./getThemeDocumentFromLibrary";
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
  | Readonly<{
      kind: "theme";
    }>
  | Readonly<{
      kind: "item";
      itemId: string;
    }>;
/** The theme an export renders with: a saved theme id plus unsaved edits. */
export type ExportTheme = Readonly<{
  id: string;
  patch?: VideoThemePatch;
}>;
/** A draft with no edits. */
export const EMPTY_THEME_DRAFT: ThemeDraft = { patch: {}, overrides: {} };
type DraftTarget = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
  itemId?: string;
}>;

/** A draft with one token set in a scope, replacing any earlier draft value. */
function _setTokenInDraft(
  options: Readonly<{
    draft: ThemeDraft;
    scope: ThemeEditScope;
    tokenPath: string;
    value: unknown;
  }>,
): ThemeDraft {
  const { draft, scope, tokenPath, value } = options;
  const patch = setValueAtPath({
    source: getScopedPatchFromDraft({ draft, scope }),
    path: getDocumentPathFromTokenPath(tokenPath),
    value,
  });
  return _withScopePatch({ draft, scope, patch });
}
/** A draft with one token's draft value removed from a scope. */
function _resetTokenInDraft(
  options: Readonly<{
    draft: ThemeDraft;
    scope: ThemeEditScope;
    tokenPath: string;
  }>,
): ThemeDraft {
  const { draft, scope, tokenPath } = options;
  const patch = removeValueAtPath({
    source: getScopedPatchFromDraft({ draft, scope }),
    path: getDocumentPathFromTokenPath(tokenPath),
  });
  return _withScopePatch({ draft, scope, patch });
}
/** Whether a draft holds any edit. */
function _isThemeDraftEmpty(draft: ThemeDraft): boolean {
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
function _listTokenPathsFromPatch(patch: VideoThemePatch): readonly string[] {
  return TokenCatalog.listTokenDefinitions().flatMap(({ path, isScale }) => {
    const value = getValueAtPath({
      source: patch,
      path: getDocumentPathFromTokenPath(path),
    });
    return value === undefined
      ? []
      : isScale && isRecord(value)
        ? Object.keys(value).map((key) => {
            return `${path}.${key}`;
          })
        : [path];
  });
}
function _draftTarget(target: DraftTarget): DraftThemeTarget {
  return makeDraftThemeTargetFromLibrary({
    library: target.library,
    themeId: target.themeId,
    hasDraft: !_isThemeDraftEmpty(target.draft),
  });
}
/**
 * How many tokens an item overrides, saved or drafted, one per token the
 * producer changed. A custom value's generated scale entry is not counted
 * apart from the token that points at it. On a built-in theme
 * with a draft the saved overrides do not count: the new theme saving would
 * create does not inherit them.
 */
function _countItemOverrides(
  target: DraftTarget &
    Readonly<{
      itemId: string;
    }>,
): number {
  const themeTarget = _draftTarget(target);
  const saved =
    _getDocument({
      library: themeTarget.library,
      themeId: themeTarget.themeId,
    }).overrides?.[target.itemId] ?? {};
  return new Set(
    [
      ..._listTokenPathsFromPatch(saved),
      ..._listTokenPathsFromPatch(target.draft.overrides[target.itemId] ?? {}),
    ].filter((tokenPath) => {
      return !CustomScaleKeys.isCustomScaleEntryPath(tokenPath);
    }),
  ).size;
}

/**
 * The theme file a save writes: each draft token set whole, theme edits at
 * the theme level and item edits into `overrides`.
 */
function _toSavedDocument({
  document,
  draft,
}: Readonly<{
  document: VideoThemeDocument;
  draft: ThemeDraft;
}>): VideoThemeDocument {
  const overrides = {
    ...document.overrides,
    ...makeObjectFromEntries(
      Object.entries(draft.overrides).map(([itemId, patch]) => {
        return [
          itemId,
          _applyPatch({
            target: document.overrides?.[itemId] ?? {},
            patch,
          }),
        ];
      }),
    ),
  };
  return {
    ..._applyPatch({
      target: document,
      patch: draft.patch,
    }),
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
  } as VideoThemeDocument;
}
/**
 * A new theme holding a draft. From a built-in it is a sparse theme that
 * extends the built-in (whose per-item overrides it does not inherit); from
 * a custom theme it is a full copy with the draft folded in.
 */
function _makeNewDocumentFromBase(
  options: Readonly<{
    base: VideoThemeDocument;
    draft: ThemeDraft;
    id: string;
    label: string;
  }>,
): VideoThemeDocument {
  const { base, draft, id, label } = options;
  if (!BUILT_IN_VIDEO_THEMES.has(base.id)) {
    return {
      ..._toSavedDocument({
        document: base,
        draft,
      }),
      id,
      label,
    };
  }
  const overrides = makeObjectFromEntries(
    Object.entries(draft.overrides).map(([itemId, patch]) => {
      return [
        itemId,
        _applyPatch({
          target: {},
          patch,
        }),
      ];
    }),
  );
  return {
    schemaVersion: 1,
    id,
    label,
    extends: base.id,
    ..._applyPatch({
      target: {},
      patch: draft.patch,
    }),
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
  };
}
/**
 * The unsaved patches one item renders with, lowest first: the theme draft,
 * then the item's draft. Tokens that the draft target's own saved override
 * for the item sets are left out of the theme draft, because once saved
 * those overrides outrank theme values. A built-in theme's draft targets an
 * unsaved theme with no overrides (see `makeDraftThemeTargetFromLibrary`), so
 * nothing
 * is left out there.
 */
function _getPatchesForItem(target: DraftTarget): readonly VideoThemePatch[] {
  const { draft, itemId } = target;
  const themeTarget = _draftTarget(target);
  const saved =
    itemId === undefined
      ? {}
      : (_getDocument({
          library: themeTarget.library,
          themeId: themeTarget.themeId,
        }).overrides?.[itemId] ?? {});
  const themePatch = _listTokenPathsFromPatch(saved).reduce(
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
function _toVideoThemeSource(target: DraftTarget): VideoThemeSource {
  const themeTarget = _draftTarget(target);
  return {
    library: themeTarget.library,
    themeId: themeTarget.themeId,
    scope: {
      overrideIds: target.itemId === undefined ? [] : [target.itemId],
      patches: _getPatchesForItem(target),
    },
  };
}
/**
 * What the live player needs to render an item with the draft: the draft
 * target's custom documents (built-ins come from its bundle; a built-in's
 * draft brings its unsaved theme) and the item's draft patches.
 */
function _toSnapshot(target: DraftTarget): VideoThemeSnapshot {
  const themeTarget = _draftTarget(target);
  return VideoThemeSnapshots.fromLibrary({
    library: themeTarget.library,
    themeId: themeTarget.themeId,
    patches: _getPatchesForItem(target),
  });
}
/**
 * The `theme` an export request sends for one item: the saved id and one
 * merged patch. A present `patch`, even an empty one, tells the server a
 * draft exists, so it applies the same draft target (see
 * `makeSnapshotFromThemeRequest`) and the MP4 matches the preview. A
 * built-in theme with edits only on other items still resolves as the
 * unsaved theme, so its export carries `patch: {}`. Only a theme with no
 * draft at all sends the id alone.
 */
function _toExportTheme(target: DraftTarget): ExportTheme {
  return _isThemeDraftEmpty(target.draft)
    ? { id: target.themeId }
    : {
        id: target.themeId,
        patch: mergeVideoThemePatches(..._getPatchesForItem(target)),
      };
}
/**
 * A theme id made from a label: a slug, with a number added when taken or
 * when it would be the reserved `DRAFT_THEME_ID`.
 */
function _makeThemeIdFromLabel({
  label,
  takenIds,
}: Readonly<{
  label: string;
  takenIds: readonly string[];
}>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "theme";
  const taken = new Set(takenIds);
  let id = base;
  for (let suffix = 2; taken.has(id) || id === DRAFT_THEME_ID; suffix += 1) {
    id = `${base}-${suffix}`;
  }
  return id;
}

/**
 * Applies scoped draft edits and produces consistent preview, save, and
 * export settings.
 */
export const ThemeDrafts = {
  /** Sets one token in the selected draft scope. */
  setTokenInDraft: _setTokenInDraft,
  /** Removes one token from the selected draft scope. */
  resetTokenInDraft: _resetTokenInDraft,
  /** Reports whether a draft has any edits. */
  isThemeDraftEmpty: _isThemeDraftEmpty,
  /** Lists the complete token values a patch supplies. */
  listTokenPathsFromPatch: _listTokenPathsFromPatch,
  /** Counts saved and drafted token overrides for one item. */
  countItemOverrides: _countItemOverrides,
  /** Applies scoped draft edits to a saved theme document. */
  toSavedDocument: _toSavedDocument,
  /** Makes a new theme document from a base and its draft. */
  makeNewDocumentFromBase: _makeNewDocumentFromBase,
  /** Gets ordered draft patches for a previewed item. */
  getPatchesForItem: _getPatchesForItem,
  /** Gets the shared theme source for draft previews and exports. */
  toVideoThemeSource: _toVideoThemeSource,
  /** Captures portable player settings for a draft. */
  toSnapshot: _toSnapshot,
  /** Gets the selected theme and merged draft patch for export. */
  toExportTheme: _toExportTheme,
  /** Makes an available theme id from a producer-authored label. */
  makeThemeIdFromLabel: _makeThemeIdFromLabel,
};
