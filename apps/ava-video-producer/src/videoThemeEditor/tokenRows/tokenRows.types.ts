import {
  type ThemeDraft,
  type ThemeEditScope,
} from "../ThemeDrafts/ThemeDrafts";
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
/** Resolved values used while constructing token editor rows. */
export type RowContext = Readonly<{
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
/** The theme and scope used to construct editor rows. */
export type TokenRowsOptions = Readonly<{
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
/**
 * What a row's resolver message means, so the row can say it in plain words.
 */
export type RowIssueDescription =
  | Readonly<{ kind: "missingReference"; reference: string }>
  | Readonly<{ kind: "loop" }>
  | Readonly<{ kind: "other" }>;
