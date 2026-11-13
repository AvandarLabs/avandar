import { ATOMIC_TOKENS } from "./atomicTokens";
import { COMPONENT_TOKENS } from "./componentTokens";
import { isTokenDefinition, isTokenScale } from "./defineTokens";
import { MANTINE_TOKENS } from "./mantineTokens";
import { SEMANTIC_TOKENS } from "./semanticTokens";
import type { CatalogNode, TokenDefinition } from "../videoTheme.types";

/**
 * Every video design token with its metadata, by tier. The theme schema, JSON
 * Schema, resolver, CSS variables, usage tracking, and the token editor all
 * walk this one catalog, so adding a token here is what makes it themeable.
 */
export const VIDEO_TOKEN_CATALOG = {
  mantine: MANTINE_TOKENS,
  atomic: ATOMIC_TOKENS,
  semantic: SEMANTIC_TOKENS,
  components: COMPONENT_TOKENS,
} as const;

/** One catalog leaf and its token path. A scale is listed once, by its own path. */
export type CatalogEntry = Readonly<{
  path: string;
  definition: TokenDefinition;
  isScale: boolean;
}>;

/** Whether a path's first segment names a Mantine-native theme key. */
export function isMantineTokenRoot(segment: string): boolean {
  return Object.hasOwn(MANTINE_TOKENS, segment);
}

function _listNode(node: CatalogNode, path: readonly string[]): CatalogEntry[] {
  if (isTokenDefinition(node)) {
    return [{ path: path.join("."), definition: node, isScale: false }];
  }
  if (isTokenScale(node)) {
    return [{ path: path.join("."), definition: node.scale, isScale: true }];
  }
  return Object.entries(node).flatMap(([key, child]) =>
    _listNode(child, [...path, key]),
  );
}

/**
 * Every token in the catalog with its path, in the same syntax as a
 * reference without the `$`: `colors.primary`, `atomic.swatch`,
 * `color.accent`, `components.ProgressBar.height`. Use it to iterate tokens,
 * for example to build controls or check metadata.
 */
export function listTokenDefinitions(): readonly CatalogEntry[] {
  return [
    ..._listNode(MANTINE_TOKENS, []),
    ..._listNode(ATOMIC_TOKENS, ["atomic"]),
    ..._listNode(SEMANTIC_TOKENS, []),
    ..._listNode(COMPONENT_TOKENS, ["components"]),
  ];
}

function _getSectionFromPath(
  segments: readonly string[],
): readonly [CatalogNode, readonly string[]] {
  const [root, ...rest] = segments;
  if (root === "atomic") {
    return [ATOMIC_TOKENS, rest];
  }
  if (root === "components") {
    return [COMPONENT_TOKENS, rest];
  }
  return [
    isMantineTokenRoot(root) ? MANTINE_TOKENS : SEMANTIC_TOKENS,
    segments,
  ];
}

/**
 * The definition of the token at a path, or undefined for an unknown path.
 * A path into a scale, such as `atomic.swatch.mint`, returns the scale's
 * definition. Use it to label or validate a token found by path.
 */
export function getTokenDefinitionFromPath(
  path: string,
): TokenDefinition | undefined {
  const [section, remaining] = _getSectionFromPath(path.split("."));
  let node: CatalogNode = section;
  for (const [index, segment] of remaining.entries()) {
    if (isTokenScale(node)) {
      return index === remaining.length - 1 ? node.scale : undefined;
    }
    if (isTokenDefinition(node) || !Object.hasOwn(node, segment)) {
      return undefined;
    }
    node = node[segment];
  }
  return isTokenDefinition(node) ? node : undefined;
}
