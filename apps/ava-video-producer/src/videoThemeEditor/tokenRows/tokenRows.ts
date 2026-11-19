import { createDraftThemeTarget } from "../../videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { getResolvedTokenValue } from "../../videoTheme/getResolvedTokenValue";
import { getValueAtPath } from "../../videoTheme/getValueAtPath";
import {
  isMantineTokenRoot,
  listTokenDefinitions,
} from "../../videoTheme/tokenCatalog/tokenCatalogHelpers";
import { getDocumentPathFromTokenPath } from "../getDocumentPathFromTokenPath/getDocumentPathFromTokenPath";
import {
  isThemeDraftEmpty,
  type ThemeDraft,
  type ThemeEditScope,
} from "../themeDraft/themeDraft";
import type {
  ResolvedVideoTheme,
  TokenDefinition,
  VideoThemeIssue,
  VideoThemeLibrary,
  VideoThemePatch,
} from "../../videoTheme/videoTheme.types";

/** Which layer of the theme a token belongs to. */
export type TokenTier = "mantine" | "atomic" | "semantic" | "component";

/** Whether the scope being edited sets a token itself, and how. */
export type TokenOverrideState = "none" | "draft" | "saved";

/** One editable token as a scope sees it. */
export type TokenRow = Readonly<{
  path: string;
  definition: TokenDefinition;
  /** The key inside a scale, such as `mint` for `atomic.swatch.mint`. */
  scaleKey?: string;
  tier: TokenTier;
  /** Accordion section: `<tier>:<name>`. */
  group: string;
  /** The authored value in effect: a reference or a literal. */
  value: unknown;
  resolved: unknown;
  overrideState: TokenOverrideState;
  /**
   * In theme scope, the value the previewed item uses when it has its own
   * for this token, saved or unsaved. Item scope states this in
   * `overrideState`, so it never sets this.
   */
  itemOverride?: Readonly<{ resolved: unknown }>;
}>;

/** A run of rows that share a section. */
export type TokenRowGroup = Readonly<{
  group: string;
  rows: readonly TokenRow[];
}>;

/** How the editor narrows its rows. */
export type TokenRowFilter = Readonly<{
  tiers: readonly TokenTier[];
  query: string;
  /** When set, semantic and component rows must appear here. */
  usedTokens?: readonly string[];
  /** The label and description of a row, for search. */
  getText: (row: TokenRow) => string;
}>;

/**
 * The handful of tokens that change a look the most. The editor shows them
 * first, above the tiers, in this order.
 */
export const ESSENTIAL_TOKEN_PATHS = [
  "color.accent",
  "color.ground",
  "color.text",
  "atomic.fontFamily.figtree",
  "stroke.default",
  "corner.panel",
  "motion.tempo",
  "sketch.box",
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

type RowContext = Readonly<{
  merged: VideoThemePatch;
  theme: ResolvedVideoTheme;
  scopePatch: VideoThemePatch;
  savedOverride: VideoThemePatch;
  /**
   * In theme scope, the previewed item's own settings and the theme it resolves
   * to.
   */
  itemOwn?: Readonly<{
    patches: readonly VideoThemePatch[];
    theme: ResolvedVideoTheme;
  }>;
}>;

function _tierFromRoot(root: string): TokenTier {
  if (root === "atomic") {
    return "atomic";
  }
  if (root === "components") {
    return "component";
  }
  return isMantineTokenRoot(root) ? "mantine" : "semantic";
}

function _groupFromSegments(
  segments: readonly string[],
  tier: TokenTier,
): string {
  if (tier === "atomic" || tier === "component") {
    return `${tier}:${segments[1]}`;
  }
  return tier === "mantine"
    ? `mantine:${MANTINE_GROUPS[segments[0]] ?? segments[0]}`
    : `semantic:${segments[0]}`;
}

// A built-in theme with a draft previews as an unsaved theme with no
// overrides of its own (see createDraftThemeTarget), so none show as saved.
function _savedOverride(
  options: Readonly<{
    library: VideoThemeLibrary;
    themeId: string;
    draft: ThemeDraft;
    itemId: string;
  }>,
): VideoThemePatch {
  const target = createDraftThemeTarget({
    library: options.library,
    themeId: options.themeId,
    hasDraft: !isThemeDraftEmpty(options.draft),
  });
  return target.library.get(target.themeId)?.overrides?.[options.itemId] ?? {};
}

function _createRow(
  options: Readonly<{
    context: RowContext;
    path: string;
    definition: TokenDefinition;
    scaleKey?: string;
  }>,
): TokenRow {
  const { context, path, definition, scaleKey } = options;
  const segments = path.split(".");
  const tier = _tierFromRoot(segments[0]);
  const documentPath = getDocumentPathFromTokenPath(path);
  const overrideState: TokenOverrideState =
    getValueAtPath(context.scopePatch, documentPath) !== undefined
      ? "draft"
      : getValueAtPath(context.savedOverride, documentPath) !== undefined
        ? "saved"
        : "none";
  const isItemOwn = context.itemOwn?.patches.some((patch) => {
    return getValueAtPath(patch, documentPath) !== undefined;
  });
  return {
    path,
    definition,
    ...(scaleKey === undefined ? {} : { scaleKey }),
    tier,
    group: _groupFromSegments(segments, tier),
    value: getValueAtPath(context.merged, documentPath),
    resolved: getResolvedTokenValue(context.theme, path),
    overrideState,
    ...(isItemOwn && context.itemOwn
      ? {
          itemOverride: {
            resolved: getResolvedTokenValue(context.itemOwn.theme, path),
          },
        }
      : {}),
  };
}

type TokenRowsOptions = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
  scope: ThemeEditScope;
  merged: VideoThemePatch;
  theme: ResolvedVideoTheme;
  /**
   * The previewed item and the theme it resolves to, so theme scope can show
   * its own values.
   */
  item?: Readonly<{ id: string; theme: ResolvedVideoTheme }>;
}>;

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
export function listTokenRows(options: TokenRowsOptions): readonly TokenRow[] {
  const context = _createRowContext(options);
  return listTokenDefinitions().flatMap(({ path, definition, isScale }) => {
    if (!isScale) {
      return [_createRow({ context, path, definition })];
    }
    const entries = getValueAtPath(
      options.merged,
      getDocumentPathFromTokenPath(path),
    );
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
  });
}

/**
 * Rows in the chosen tiers that match the search and, when given, the
 * tokens an item used. Atomic and Mantine rows ignore usage: renders report
 * the semantic and component tokens they read, not what those point at.
 */
export function filterTokenRows(
  options: Readonly<{ rows: readonly TokenRow[]; filter: TokenRowFilter }>,
): readonly TokenRow[] {
  const { rows, filter } = options;
  const query = filter.query.trim().toLowerCase();
  return rows.filter((row) => {
    return (
      filter.tiers.includes(row.tier) &&
      (!filter.usedTokens ||
        row.tier === "atomic" ||
        row.tier === "mantine" ||
        filter.usedTokens.includes(row.path)) &&
      (!query ||
        row.path.toLowerCase().includes(query) ||
        filter.getText(row).toLowerCase().includes(query))
    );
  });
}

/** Rows split into sections, keeping first-appearance order. */
export function groupTokenRows(
  rows: readonly TokenRow[],
): readonly TokenRowGroup[] {
  const groups = rows.reduce((grouped, row) => {
    return grouped.set(row.group, [...(grouped.get(row.group) ?? []), row]);
  }, new Map<string, TokenRow[]>());
  return [...groups].map(([group, grouped]) => {
    return { group, rows: grouped };
  });
}

/** The Essentials rows, in their fixed order. */
export function getEssentialRows(
  rows: readonly TokenRow[],
): readonly TokenRow[] {
  return ESSENTIAL_TOKEN_PATHS.flatMap((path) => {
    return rows.filter((row) => {
      return row.path === path;
    });
  });
}

/**
 * Sections for atomic scales that have no entries yet, such as an empty
 * `textShadow` scale, so the editor can offer to add the first value.
 */
export function listEmptyAtomicScaleGroups(
  rows: readonly TokenRow[],
): readonly string[] {
  const filled = new Set(
    rows.map((row) => {
      return row.group;
    }),
  );
  return listTokenDefinitions()
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
export function findTokenRowIssue(
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
 * What a row's resolver message means, so the row can say it in plain words.
 */
export type RowIssueDescription =
  | Readonly<{ kind: "missingReference"; reference: string }>
  | Readonly<{ kind: "loop" }>
  | Readonly<{ kind: "other" }>;

/**
 * Sorts a resolver message into the cases the editor words for a producer: a
 * reference to a token that is gone, a reference loop, or anything else. The
 * raw message stays available as secondary detail.
 */
export function describeRowIssue(issue: VideoThemeIssue): RowIssueDescription {
  const missing = /^(\$\S+) does not point at a token$/.exec(issue.message);
  if (missing) {
    return { kind: "missingReference", reference: missing[1] };
  }
  return issue.message.startsWith("Reference cycle:")
    ? { kind: "loop" }
    : { kind: "other" };
}

/**
 * The key for a value added to a scale group: the first `custom<n>` no entry
 * of that scale uses. Pass every row, not a filtered view, so a value hidden
 * by search is never overwritten.
 */
export function buildNextCustomScaleKey(
  options: Readonly<{ rows: readonly TokenRow[]; group: string }>,
): string {
  const { rows, group } = options;
  const taken = new Set(
    rows
      .filter((row) => {
        return row.group === group;
      })
      .map((row) => {
        return row.scaleKey;
      }),
  );
  let index = 1;
  while (taken.has(`custom${index}`)) {
    index += 1;
  }
  return `custom${index}`;
}
