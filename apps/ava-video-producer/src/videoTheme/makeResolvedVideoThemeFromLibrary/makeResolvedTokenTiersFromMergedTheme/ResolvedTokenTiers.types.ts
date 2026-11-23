import { type MantineTheme } from "@mantine/core";
import type { TokenDefinition, VideoThemeIssue } from "../../videoTheme.types";
/** Inputs for choosing a color pair by its contrast token's luminance. */
export type PickPairByContrastColorOptions = {
  context: ResolutionContext;
  definition: TokenDefinition;
  raw: Readonly<{
    onDark: unknown;
    onLight: unknown;
  }>;
  path: string;
};
/** Inputs for resolving a raw token against its catalog definition. */
export type BuildTokenFromDefinitionOptions = {
  context: ResolutionContext;
  definition: TokenDefinition;
  raw: unknown;
  path: string;
};
/** Raw theme tiers, contrast state, and collected resolution issues. */
export type ResolutionContext = Readonly<{
  atomic: unknown;
  semantic: unknown;
  components: unknown;
  mantine: MantineTheme;
  isDarkGround: boolean;
  /**
   * True while resolving the ground itself, which cannot depend on the
   * ground.
   */
  forbidColorPairs: boolean;
  issues: VideoThemeIssue[];
}>;
/** Resolved tiers of one merged theme, plus every problem found on the way. */
export type ResolvedTokenTiers = Readonly<{
  atomic: unknown;
  semantic: unknown;
  components: unknown;
  isDarkGround: boolean;
  issues: readonly VideoThemeIssue[];
}>;
/** A readonly object whose field values have not yet been validated. */
export type UnknownRecord = Readonly<Record<string, unknown>>;
