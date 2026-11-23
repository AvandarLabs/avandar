import { prop, propEq } from "@avandar/utils";
import { getResolvedTokenValue } from "../../videoTheme/getResolvedTokenValue";
import { getValueAtPath } from "../../videoTheme/getValueAtPath";
import { makeDraftThemeTargetFromLibrary } from "../../videoTheme/makeDraftThemeTargetFromLibrary/makeDraftThemeTargetFromLibrary";
import { TokenCatalog } from "../../videoTheme/tokenCatalog/TokenCatalog/TokenCatalog";
import { getDocumentPathFromTokenPath } from "../getDocumentPathFromTokenPath/getDocumentPathFromTokenPath";
import { type ThemeDraft, ThemeDrafts } from "../ThemeDrafts/ThemeDrafts";
import { getTokenOverrideStateFromContext as _getOverrideState } from "./getTokenOverrideStateFromContext";
import {
  type RowContext,
  type RowIssueDescription,
  type TokenRow,
  type TokenRowFilter,
  type TokenRowGroup,
  type TokenRowsOptions,
  type TokenTier,
} from "./TokenRows.types";
import type {
  TokenDefinition,
  VideoThemeIssue,
  VideoThemeLibrary,
  VideoThemePatch,
} from "../../videoTheme/videoTheme.types";

/**
 * The handful of tokens that change a look the most: the Look and feel
 * rows. The editor shows them first, above the tiers, in this order. Each
 * global option (line weight, corner style, shadow intensity, tint
 * strength, easing family, stagger, entrance style, loop fade) sits beside
 * the token it adjusts and starts at its identity value, so it changes
 * nothing until a producer moves it.
 */
export const ESSENTIAL_TOKEN_PATHS = [
  "color.accent",
  "color.ground",
  "color.text",
  "atomic.fontFamily.figtree",
  "stroke.default",
  "stroke.scale",
  "corner.panel",
  "corner.scale",
  "elevation.strength",
  "alpha.washScale",
  "motion.tempo",
  "motion.easingProfile",
  "motion.staggerScale",
  "motion.entranceStyle",
  "motion.loopFade.graphic",
  "sketch.box",
  "sketch.shape",
  "sketch.annotation",
  "color.categorical.1",
  "color.categorical.2",
  "color.categorical.3",
  "color.categorical.4",
  "color.categorical.5",
  "color.categorical.6",
  "color.categorical.7",
  "color.categorical.8",
  "color.categorical.9",
] as const;
const MANTINE_GROUPS: Readonly<Record<string, string>> = {
  colors: "palette",
  white: "palette",
  black: "palette",
  primaryColor: "palette",
  primaryShade: "palette",
  defaultGradient: "palette",
  fontFamily: "type",
  fontFamilyMonospace: "type",
  headings: "type",
  fontSizes: "type",
  lineHeights: "type",
  radius: "dimension",
  spacing: "dimension",
  autoContrast: "rendering",
  luminanceThreshold: "rendering",
  fontSmoothing: "rendering",
};
type TokenRowOptions = {
  context: RowContext;
  path: string;
  definition: TokenDefinition;
  scaleKey?: string;
};

function _tierFromRoot(root: string): TokenTier {
  if (root === "atomic") {
    return "atomic";
  }
  return root === "components"
    ? "component"
    : TokenCatalog.isMantineTokenRoot(root)
      ? "mantine"
      : "semantic";
}
function _groupFromSegments({
  segments,
  tier,
}: Readonly<{
  segments: readonly string[];
  tier: TokenTier;
}>): string {
  return tier === "atomic" || tier === "component"
    ? `${tier}:${segments[1]}`
    : tier === "mantine"
      ? `mantine:${MANTINE_GROUPS[segments[0]] ?? segments[0]}`
      : `semantic:${segments[0]}`;
}
// A built-in theme with a draft previews as an unsaved theme with no
// overrides of its own (see makeDraftThemeTargetFromLibrary), so none show as
// saved.
function _savedOverride(
  options: Readonly<{
    library: VideoThemeLibrary;
    themeId: string;
    draft: ThemeDraft;
    itemId: string;
  }>,
): VideoThemePatch {
  const target = makeDraftThemeTargetFromLibrary({
    library: options.library,
    themeId: options.themeId,
    hasDraft: !ThemeDrafts.isThemeDraftEmpty(options.draft),
  });
  return target.library.get(target.themeId)?.overrides?.[options.itemId] ?? {};
}
function _createRow(options: Readonly<TokenRowOptions>): TokenRow {
  const { context, path, definition, scaleKey } = options;
  const segments = path.split(".");
  const tier = _tierFromRoot(segments[0]);
  const documentPath = getDocumentPathFromTokenPath(path);
  const overrideState = _getOverrideState({ context, documentPath });
  const isItemOwn = context.itemOwn?.patches.some((patch) => {
    return (
      getValueAtPath({
        source: patch,
        path: documentPath,
      }) !== undefined
    );
  });
  return {
    path,
    definition,
    ...(scaleKey === undefined ? {} : { scaleKey }),
    tier,
    group: _groupFromSegments({
      segments,
      tier,
    }),
    value: getValueAtPath({
      source: context.merged,
      path: documentPath,
    }),
    resolved: getResolvedTokenValue({
      theme: context.theme,
      path,
    }),
    overrideState,
    ...(isItemOwn && context.itemOwn
      ? {
          itemOverride: {
            resolved: getResolvedTokenValue({
              theme: context.itemOwn.theme,
              path,
            }),
          },
        }
      : {}),
  };
}
function _createRowContext(options: TokenRowsOptions): RowContext {
  const { scope, draft, item } = options;
  return {
    merged: options.merged,
    theme: options.theme,
    scopePatch:
      scope.kind === "theme"
        ? draft.patch
        : (draft.overrides[scope.itemId] ?? {}),
    savedOverride:
      scope.kind === "item"
        ? _savedOverride({ ...options, itemId: scope.itemId })
        : {},
    ...(scope.kind === "theme" && item
      ? {
          itemOwn: {
            patches: [
              _savedOverride({ ...options, itemId: item.id }),
              draft.overrides[item.id] ?? {},
            ],
            theme: item.theme,
          },
        }
      : {}),
  };
}
/**
 * Every token as one scope sees it, one row per scale entry, in catalog
 * order. The editor filters and groups these rows; reference pickers read
 * them for their options.
 */
function _listTokenRows(options: TokenRowsOptions): readonly TokenRow[] {
  const context = _createRowContext(options);
  return TokenCatalog.listTokenDefinitions().flatMap(
    ({ path, definition, isScale }) => {
      if (!isScale) {
        return [_createRow({ context, path, definition })];
      }
      const entries = getValueAtPath({
        source: options.merged,
        path: getDocumentPathFromTokenPath(path),
      });
      const keys =
        typeof entries === "object" && entries !== null
          ? Object.keys(entries)
          : [];
      return keys.map((key) => {
        return _createRow({
          context,
          path: `${path}.${key}`,
          definition,
          scaleKey: key,
        });
      });
    },
  );
}
/**
 * Rows in the chosen tiers that match the search and, when given, the
 * tokens an item used. Atomic and Mantine rows ignore usage: renders report
 * the semantic and component tokens they read, not what those point at.
 */
function _filterTokenRows(
  options: Readonly<{
    rows: readonly TokenRow[];
    filter: TokenRowFilter;
  }>,
): readonly TokenRow[] {
  const { rows, filter } = options;
  const query = filter.query.trim().toLowerCase();
  const allowedTiers = new Set(filter.tiers);
  const usedTokenSet = filter.usedTokens
    ? new Set(filter.usedTokens)
    : undefined;
  return rows.filter((row) => {
    return (
      allowedTiers.has(row.tier) &&
      (!usedTokenSet ||
        row.tier === "atomic" ||
        row.tier === "mantine" ||
        usedTokenSet.has(row.path)) &&
      (!query ||
        row.path.toLowerCase().includes(query) ||
        filter.getText(row).toLowerCase().includes(query))
    );
  });
}
/** Rows split into sections, keeping first-appearance order. */
function _groupTokenRows(rows: readonly TokenRow[]): readonly TokenRowGroup[] {
  const groups = rows.reduce((grouped, row) => {
    return grouped.set(row.group, [...(grouped.get(row.group) ?? []), row]);
  }, new Map<string, TokenRow[]>());
  return [...groups].map(([group, grouped]) => {
    return { group, rows: grouped };
  });
}
/** The Essentials rows, in their fixed order. */
function _getEssentialRows(rows: readonly TokenRow[]): readonly TokenRow[] {
  return ESSENTIAL_TOKEN_PATHS.flatMap((path) => {
    return rows.filter(propEq("path", path));
  });
}
/**
 * Sections for atomic scales that have no entries yet, such as an empty
 * `textShadow` scale, so the editor can offer to add the first value.
 */
function _listEmptyAtomicScaleGroups(
  rows: readonly TokenRow[],
): readonly string[] {
  const filled = new Set(rows.map(prop("group")));
  return TokenCatalog.listTokenDefinitions()
    .filter(({ path, isScale }) => {
      return isScale && path.startsWith("atomic.");
    })
    .map(({ path }) => {
      return `atomic:${path.split(".")[1]}`;
    })
    .filter((group) => {
      return !filled.has(group);
    });
}
/**
 * The resolver problem a row shows: one reported at the token itself or at
 * one of its fields, such as `text.stage.title.color` for `text.stage.title`.
 */
function _findTokenRowIssue(
  options: Readonly<{
    issues: readonly VideoThemeIssue[];
    tokenPath: string;
  }>,
): VideoThemeIssue | undefined {
  const { issues, tokenPath } = options;
  return issues.find((issue) => {
    return issue.path === tokenPath || issue.path.startsWith(`${tokenPath}.`);
  });
}
/**
 * Sorts a resolver message into the cases the editor words for a producer: a
 * reference to a token that is gone, a reference loop, or anything else. The
 * raw message stays available as secondary detail.
 */
function _describeRowIssue(issue: VideoThemeIssue): RowIssueDescription {
  const missing = /^(\$\S+) does not point at a token$/.exec(issue.message);
  return missing
    ? { kind: "missingReference", reference: missing[1] }
    : issue.message.startsWith("Reference cycle:")
      ? { kind: "loop" }
      : { kind: "other" };
}
/**
 * The key for a value added to a scale group: the first `custom<n>` no entry
 * of that scale uses. Pass every row, not a filtered view, so a value hidden
 * by search is never overwritten.
 */
function _makeNextCustomScaleKeyFromRows(
  options: Readonly<{
    rows: readonly TokenRow[];
    group: string;
  }>,
): string {
  const { rows, group } = options;
  const taken = new Set(
    rows.filter(propEq("group", group)).map(prop("scaleKey")),
  );
  let index = 1;
  while (taken.has(`custom${index}`)) {
    index += 1;
  }
  return `custom${index}`;
}

/**
 * Lists, filters, and groups theme token rows for editor tables and reference
 * pickers.
 */
export const TokenRows = {
  /**
   * Every token as one scope sees it, one row per scale entry, in catalog
   * order.
   */
  listTokenRows: _listTokenRows,
  /**
   * Rows in the chosen tiers that match the search and, when given, the tokens
   * an item used.
   */
  filterTokenRows: _filterTokenRows,
  /** Rows split into sections, keeping first-appearance order. */
  groupTokenRows: _groupTokenRows,
  /** The Essentials rows, in their fixed order. */
  getEssentialRows: _getEssentialRows,
  /**
   * Sections for atomic scales that have no entries yet, such as an empty
   * `textShadow` scale, so the editor can offer to add the first value.
   */
  listEmptyAtomicScaleGroups: _listEmptyAtomicScaleGroups,
  /**
   * The resolver problem a row shows: one reported at the token itself or at
   * one of its fields, such as `text.stage.title.color` for `text.stage.title`.
   */
  findTokenRowIssue: _findTokenRowIssue,
  /**
   * Sorts a resolver message into the cases the editor words for a producer: a
   * reference to a token that is gone, a reference loop, or anything else.
   */
  describeRowIssue: _describeRowIssue,
  /**
   * The key for a value added to a scale group: the first `custom<n>` no entry
   * of that scale uses.
   */
  makeNextCustomScaleKeyFromRows: _makeNextCustomScaleKeyFromRows,
};
