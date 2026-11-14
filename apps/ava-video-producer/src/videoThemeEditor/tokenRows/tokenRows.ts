import { createDraftThemeTarget } from "../../videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import {
  getResolvedTokenValue,
  getValueAtPath,
} from "../../videoTheme/getResolvedTokenValue/getResolvedTokenValue";
import {
  isMantineTokenRoot,
  listTokenDefinitions,
} from "../../videoTheme/tokenCatalog/tokenCatalog";
import {
  getDocumentPathFromTokenPath,
  isThemeDraftEmpty,
  type ThemeDraft,
  type ThemeEditScope,
} from "../themeDraft/themeDraft";
import type {
  ResolvedVideoTheme,
  TokenDefinition,
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
  /** The translated label and description of a row, for search. */
  getText: (row: TokenRow) => string;
}>;

/** The handful of tokens that change a look the most, always shown first (spec §3.2). */
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
  }>,
  itemId: string,
): VideoThemePatch {
  const target = createDraftThemeTarget({
    library: options.library,
    themeId: options.themeId,
    hasDraft: !isThemeDraftEmpty(options.draft),
  });
  return target.library.get(target.themeId)?.overrides?.[itemId] ?? {};
}

function _createRow(
  context: RowContext,
  path: string,
  definition: TokenDefinition,
  scaleKey?: string,
): TokenRow {
  const segments = path.split(".");
  const tier = _tierFromRoot(segments[0]);
  const documentPath = getDocumentPathFromTokenPath(path);
  const overrideState: TokenOverrideState =
    getValueAtPath(context.scopePatch, documentPath) !== undefined
      ? "draft"
      : getValueAtPath(context.savedOverride, documentPath) !== undefined
        ? "saved"
        : "none";
  return {
    path,
    definition,
    ...(scaleKey === undefined ? {} : { scaleKey }),
    tier,
    group: _groupFromSegments(segments, tier),
    value: getValueAtPath(context.merged, documentPath),
    resolved: getResolvedTokenValue(context.theme, path),
    overrideState,
  };
}

/**
 * Every token as one scope sees it, one row per scale entry, in catalog
 * order. The editor filters and groups these rows; reference pickers read
 * them for their options.
 */
export function listTokenRows(
  options: Readonly<{
    library: VideoThemeLibrary;
    themeId: string;
    draft: ThemeDraft;
    scope: ThemeEditScope;
    merged: VideoThemePatch;
    theme: ResolvedVideoTheme;
  }>,
): readonly TokenRow[] {
  const { scope, draft } = options;
  const context: RowContext = {
    merged: options.merged,
    theme: options.theme,
    scopePatch:
      scope.kind === "theme"
        ? draft.patch
        : (draft.overrides[scope.itemId] ?? {}),
    savedOverride:
      scope.kind === "item" ? _savedOverride(options, scope.itemId) : {},
  };
  return listTokenDefinitions().flatMap(({ path, definition, isScale }) => {
    if (!isScale) {
      return [_createRow(context, path, definition)];
    }
    const entries = getValueAtPath(
      options.merged,
      getDocumentPathFromTokenPath(path),
    );
    const keys =
      typeof entries === "object" && entries !== null
        ? Object.keys(entries)
        : [];
    return keys.map((key) =>
      _createRow(context, `${path}.${key}`, definition, key),
    );
  });
}

/**
 * Rows in the chosen tiers that match the search and, when given, the
 * tokens an item used. Atomic and Mantine rows ignore usage: renders report
 * the semantic and component tokens they read, not what those point at.
 */
export function filterTokenRows(
  rows: readonly TokenRow[],
  filter: TokenRowFilter,
): readonly TokenRow[] {
  const query = filter.query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      filter.tiers.includes(row.tier) &&
      (!filter.usedTokens ||
        row.tier === "atomic" ||
        row.tier === "mantine" ||
        filter.usedTokens.includes(row.path)) &&
      (!query ||
        row.path.toLowerCase().includes(query) ||
        filter.getText(row).toLowerCase().includes(query)),
  );
}

/** Rows split into sections, keeping first-appearance order. */
export function groupTokenRows(
  rows: readonly TokenRow[],
): readonly TokenRowGroup[] {
  const groups = new Map<string, TokenRow[]>();
  for (const row of rows) {
    groups.set(row.group, [...(groups.get(row.group) ?? []), row]);
  }
  return [...groups].map(([group, grouped]) => ({ group, rows: grouped }));
}

/** The Essentials rows, in their fixed order. */
export function getEssentialRows(
  rows: readonly TokenRow[],
): readonly TokenRow[] {
  return ESSENTIAL_TOKEN_PATHS.flatMap((path) =>
    rows.filter((row) => row.path === path),
  );
}
