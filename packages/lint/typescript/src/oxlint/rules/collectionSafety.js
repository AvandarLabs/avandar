/** Accepts primitive constants whose evaluation cannot call user code. */
export function isPrimitiveConstant(node) {
  return node?.type === "Literal" && !node.regex && !node.bigint &&
    (node.value === null || ["string", "number", "boolean"]
      .includes(typeof node.value));
}

/** Gets ordinary data properties without paths, prototypes or accessors. */
export function getDataProperties(node) {
  if (node?.type !== "ObjectExpression" || !node.properties.length ||
    node.properties.some((property) => {
      return property.type !== "Property" || property.kind !== "init" ||
        property.method || property.computed || property.shorthand ||
        property.key.type !== "Identifier" ||
        !isPrimitiveConstant(property.value);
    })) {
    return undefined;
  }
  const names = node.properties.map((property) => {
    return property.key.name;
  });
  return new Set(names).size === names.length ? node.properties : undefined;
}

/** Proves a fresh local collection and its final direct return. */
export function getConstruction(sourceCode, block, initialType) {
  const owner = block.parent;
  const statements = block.body;
  if (owner.type !== "FunctionDeclaration" || owner.async || owner.generator ||
    statements.length < 3 || sourceCode.getCommentsInside(block).length) {
    return undefined;
  }
  const declaration = statements[0];
  const returned = statements.at(-1);
  if (declaration.type !== "VariableDeclaration" ||
    !["const", "let", "var"].includes(declaration.kind) ||
    declaration.declarations.length !== 1 ||
    declaration.declarations[0].id.type !== "Identifier" ||
    declaration.declarations[0].init?.type !== initialType ||
    returned.type !== "ReturnStatement" || returned.argument?.type !== "Identifier" ||
    returned.argument.name !== declaration.declarations[0].id.name) {
    return undefined;
  }
  const entry = declaration.declarations[0];
  const variables = sourceCode.getDeclaredVariables(declaration);
  const variable = variables.find((binding) => {
    return binding.identifiers.includes(entry.id);
  });
  if (!variable || variable.defs.length !== 1 ||
    sourceCode.getTokens(block).some((token) => {
      return ["eval", "Function"].includes(token.value);
    })) {
    return undefined;
  }
  return { owner, entry, variable, operations: statements.slice(1, -1) };
}

/** Requires all local references to belong to the exact construction uses. */
export function hasOnlyConstructionReferences(variable, identifiers) {
  return variable.references.filter((reference) => { return !reference.init; })
    .every((reference) => {
      return reference.isReadOnly() &&
        identifiers.includes(reference.identifier);
    });
}

/** Keeps a constructed collection from introducing an overlong source line. */
export function buildCollectionLiteral(
  sourceCode, node, entries, opening, closing,
) {
  const compact = `${opening}${entries.join(", ")}${closing}`;
  const lineStart = sourceCode.text.lastIndexOf("\n", node.range[0] - 1) + 1;
  const followingBreak = sourceCode.text.indexOf("\n", node.range[1]);
  const lineEnd = followingBreak < 0 ? sourceCode.text.length : followingBreak;
  const original = sourceCode.text.slice(lineStart, lineEnd);
  const repaired = sourceCode.text.slice(lineStart, node.range[0]) + compact +
    sourceCode.text.slice(node.range[1], lineEnd);
  const overflows = (text) => {
    return text.split("\n").some((line) => {
      return line.replaceAll("\t", "  ").length > 80;
    });
  };
  if (overflows(original) || !overflows(repaired)) {
    return compact;
  }
  const indent = original.match(/^\s*/)[0];
  return `${opening.trimEnd()}\n${entries.map((entry) => {
    return `${indent}  ${entry},`;
  }).join("\n")}\n${indent}${closing.trimStart()}`;
}
