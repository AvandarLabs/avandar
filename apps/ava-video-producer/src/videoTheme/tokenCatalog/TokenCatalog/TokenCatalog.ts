import { ATOMIC_TOKENS } from "../atomicTokens";
import { COMPONENT_TOKENS } from "../componentTokens/componentTokens";
import { MANTINE_TOKENS } from "../mantineTokens";
import { SEMANTIC_TOKENS } from "../semanticTokens/semanticTokens";
import { TokenDefinitions } from "../TokenDefinitions";
import type { CatalogNode, TokenDefinition } from "../../videoTheme.types";
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
/**
 * One catalog leaf and its token path. A scale is listed once, by its own path.
 */
export type CatalogEntry = Readonly<{
  path: string;
  definition: TokenDefinition;
  isScale: boolean;
}>;
/** Whether a path's first segment names a Mantine-native theme key. */
function _isMantineTokenRoot(segment: string): boolean {
  return Object.hasOwn(MANTINE_TOKENS, segment);
}
function _listNode({
  node,
  path,
}: Readonly<{
  node: CatalogNode;
  path: readonly string[];
}>): CatalogEntry[] {
  if (TokenDefinitions.isTokenDefinition(node)) {
    return [{ path: path.join("."), definition: node, isScale: false }];
  }
  return TokenDefinitions.isTokenScale(node)
    ? [{ path: path.join("."), definition: node.scale, isScale: true }]
    : Object.entries(node).flatMap(([key, child]) => {
        return _listNode({
          node: child,
          path: [...path, key],
        });
      });
}
/**
 * Every token in the catalog with its path, in the same syntax as a
 * reference without the `$`: `colors.primary`, `atomic.swatch`,
 * `color.accent`, `components.ProgressBar.height`. Use it to iterate tokens,
 * for example to build controls or check metadata.
 */
function _listTokenDefinitions(): CatalogEntry[] {
  return [
    ..._listNode({
      node: MANTINE_TOKENS,
      path: [],
    }),
    ..._listNode({
      node: ATOMIC_TOKENS,
      path: ["atomic"],
    }),
    ..._listNode({
      node: SEMANTIC_TOKENS,
      path: [],
    }),
    ..._listNode({
      node: COMPONENT_TOKENS,
      path: ["components"],
    }),
  ];
}
function _getSectionFromPath(
  segments: readonly string[],
): [CatalogNode, string[]] {
  const [root = "", ...rest] = segments;
  if (root === "atomic") {
    return [ATOMIC_TOKENS, rest];
  }
  return root === "components"
    ? [COMPONENT_TOKENS, rest]
    : [
        _isMantineTokenRoot(root) ? MANTINE_TOKENS : SEMANTIC_TOKENS,
        [...segments],
      ];
}
/**
 * The definition of the token at a path, or undefined for an unknown path.
 * A path into a scale, such as `atomic.swatch.mint`, returns the scale's
 * definition. Use it to label or validate a token found by path.
 */
function _getTokenDefinitionFromPath(
  path: string,
): TokenDefinition | undefined {
  const [section, remaining] = _getSectionFromPath(path.split("."));
  return _getTokenDefinitionFromNode({ node: section, remaining: remaining });
}
function _getTokenDefinitionFromNode({
  node,
  remaining,
}: Readonly<{ node: CatalogNode; remaining: readonly string[] }>):
  | TokenDefinition
  | undefined {
  if (remaining.length === 0) {
    return TokenDefinitions.isTokenDefinition(node) ? node : undefined;
  }
  if (TokenDefinitions.isTokenScale(node)) {
    return remaining.length === 1 ? node.scale : undefined;
  }
  const [segment, ...rest] = remaining;
  if (segment === undefined) {
    return undefined;
  }
  if (
    TokenDefinitions.isTokenDefinition(node) ||
    !Object.hasOwn(node, segment)
  ) {
    return undefined;
  }
  const child: CatalogNode | undefined = node[segment];
  return child === undefined
    ? undefined
    : _getTokenDefinitionFromNode({ node: child, remaining: rest });
}

/**
 * Looks up and enumerates token definitions for theme resolution and editor
 * controls.
 */
export const TokenCatalog = {
  /** Whether a path's first segment names a Mantine-native theme key. */
  isMantineTokenRoot: _isMantineTokenRoot,
  /**
   * Every token in the catalog with its path, in the same syntax as a reference
   * without the `$`: `colors.primary`, `atomic.swatch`, `color.accent`,
   * `components.ProgressBar.height`.
   */
  listTokenDefinitions: _listTokenDefinitions,
  /**
   * The definition of the token at a path, or undefined for an unknown path.
   */
  getTokenDefinitionFromPath: _getTokenDefinitionFromPath,
};
