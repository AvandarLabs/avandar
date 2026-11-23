import { isMantineTokenRoot } from "../tokenCatalog/tokenCatalogHelpers";
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
export function isTokenReference(value: unknown): value is TokenReference {
  return typeof value === "string" && TOKEN_REFERENCE_PATTERN.test(value);
}

/**
 * Where a reference points. `$primary` is Mantine's primary colour at the
 * primary shade, `$atomic.…` is the atomic tier, a first segment that names
 * a Mantine key (`$colors.…`, `$fontSizes.…`) is Mantine's theme, and any
 * other reference is a semantic token (`$color.accent`).
 */
export function getTargetFromTokenReference(
  reference: TokenReference,
): TokenReferenceTarget {
  const [root = "", ...rest] = reference.slice(1).split(".");
  if (root === "primary" && rest.length === 0) {
    return { tier: "primary" };
  }
  if (root === "atomic") {
    return { tier: "atomic", path: rest };
  }
  return {
    tier: isMantineTokenRoot(root) ? "mantine" : "semantic",
    path: [root, ...rest],
  };
}
