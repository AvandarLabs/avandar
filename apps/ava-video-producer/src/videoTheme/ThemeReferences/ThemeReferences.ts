import { TokenCatalog } from "../tokenCatalog/TokenCatalog/TokenCatalog";
import type { TokenReference } from "../videoTheme.types";
/** `$` then dot-separated segments; the first segment starts with a letter. */
export const TOKEN_REFERENCE_PATTERN =
  /^\$[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)*$/;

/** The tier a reference reads from, and the path inside it. */
export type TokenReferenceTarget =
  | Readonly<{ tier: "primary" }>
  | Readonly<{
      tier: "mantine" | "atomic" | "semantic";
      path: readonly string[];
    }>;

/** Whether a value is a `$` reference to another token. */
function _isTokenReference(value: unknown): value is TokenReference {
  return typeof value === "string" && TOKEN_REFERENCE_PATTERN.test(value);
}

/**
 * Where a reference points. `$primary` is Mantine's primary colour at the
 * primary shade, `$atomic.…` is the atomic tier, a first segment that names
 * a Mantine key (`$colors.…`, `$fontSizes.…`) is Mantine's theme, and any
 * other reference is a semantic token (`$color.accent`).
 */
function _getTargetFromTokenReference(
  reference: TokenReference,
): TokenReferenceTarget {
  const [root = "", ...rest] = reference.slice(1).split(".");
  if (root === "primary" && rest.length === 0) {
    return { tier: "primary" };
  }
  return root === "atomic"
    ? { tier: "atomic", path: rest }
    : {
        tier: TokenCatalog.isMantineTokenRoot(root) ? "mantine" : "semantic",
        path: [root, ...rest],
      };
}

/**
 * Recognizes token references and extracts their target paths for theme
 * resolution.
 */
export const ThemeReferences = {
  /** Whether a value is a `$` reference to another token. */
  isTokenReference: _isTokenReference,
  /** Where a reference points. */
  getTargetFromTokenReference: _getTargetFromTokenReference,
};
