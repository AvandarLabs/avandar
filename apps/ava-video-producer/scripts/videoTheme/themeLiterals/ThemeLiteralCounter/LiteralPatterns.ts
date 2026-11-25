const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const COLOR_FUNCTION_PATTERN = /\b(?:rgba?|hsla?|oklch)\(|color-mix\(/g;
const STARTER_PATTERN =
  /var\(--(?:brand|brand-soft|brand-strong|ground|foreground|background|card|muted|muted-foreground|border|shadow|radius)\)/g;
const SHADOW_FUNCTION_PATTERN = /drop-shadow\(/g;
/** Colour words that name no colour of their own. */
const NEUTRAL_COLOR_WORDS = new Set([
  "none",
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
]);
function _countMatches({
  text,
  pattern,
}: Readonly<{ text: string; pattern: RegExp }>): number {
  return text.match(pattern)?.length ?? 0;
}
/** Shared patterns for literal values in CSS and source expressions. */
export const LiteralPatterns = {
  /** Matches hexadecimal color literals. */
  HEX_PATTERN,
  /** Matches CSS functions that define or mix colors. */
  COLOR_FUNCTION_PATTERN,
  /** Matches variables tied to the starter palette. */
  STARTER_PATTERN,
  /** Matches CSS drop-shadow functions. */
  SHADOW_FUNCTION_PATTERN,
  /** Neutral color keywords allowed without theme tokens. */
  NEUTRAL_COLOR_WORDS,
  /** Counts matches of a literal pattern in source text. */
  countMatches: _countMatches,
} as const;
