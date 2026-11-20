import fs from "node:fs/promises";
import path from "node:path";
import { type NodePath, transformAsync, types } from "@babel/core";
import type { OnLoadArgs, OnLoadResult } from "esbuild";

/** The keyword an object property names, for identifier or string keys. */
function _getPropertyKeyName(
  property: types.ObjectExpression["properties"][number],
): string | undefined {
  if (!types.isObjectProperty(property)) {
    return undefined;
  }
  return types.isIdentifier(property.key)
    ? property.key.name
    : types.isStringLiteral(property.key)
      ? property.key.value
      : undefined;
}

function _isTrueKeywordProperty(
  property: types.ObjectExpression["properties"][number],
): boolean {
  const name = _getPropertyKeyName(property);
  return (
    types.isObjectProperty(property) &&
    !property.computed &&
    name !== undefined &&
    /^[A-Z][A-Z0-9_-]*$/.test(name) &&
    (types.isBooleanLiteral(property.value, { value: true }) ||
      (types.isUnaryExpression(property.value, { operator: "!" }) &&
        types.isNumericLiteral(property.value.argument, { value: 0 })))
  );
}

function _normalizeSqlKeywordSet(
  objectPath: NodePath<types.ObjectExpression>,
): void {
  const properties = objectPath.node.properties;
  // The parser's reserved-word sets contain repeated true entries.
  // Normalize only these pure sets, preserving other object semantics.
  if (!properties.every(_isTrueKeywordProperty)) {
    return;
  }
  const keywords = new Set<string | undefined>();
  objectPath.node.properties = properties.filter((property) => {
    const keyword = _getPropertyKeyName(property);
    if (keywords.has(keyword)) {
      return false;
    }
    keywords.add(keyword);
    return true;
  });
}

/**
 * Loads the `node-sql-parser` entry file with its repeated reserved-word
 * entries removed, so the bundle carries each keyword once.
 *
 * Used by the product build's load hook for that one dependency file.
 */
export async function compileSqlParser(
  args: Readonly<OnLoadArgs>,
): Promise<OnLoadResult> {
  const compiled = await transformAsync(await fs.readFile(args.path, "utf8"), {
    filename: args.path,
    configFile: false,
    babelrc: false,
    compact: true,
    plugins: [
      () => {
        return { visitor: { ObjectExpression: _normalizeSqlKeywordSet } };
      },
    ],
  });
  return {
    contents: compiled?.code ?? "",
    loader: "js",
    resolveDir: path.dirname(args.path),
  };
}
