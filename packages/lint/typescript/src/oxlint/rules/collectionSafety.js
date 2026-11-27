/**
 * Checks whether a node is a primitive constant whose evaluation cannot call
 * user code.
 * Use it, for example, when checking whether a value is safe to include in a
 * literal.
 */
export function isPrimitiveConstant(node) {
  return (
    node?.type === "Literal" &&
    !node.regex &&
    !node.bigint &&
    (node.value === null ||
      ["string", "number", "boolean"].includes(typeof node.value))
  );
}

/**
 * Returns ordinary data properties with unique identifier keys and primitive
 * values, or undefined.
 * Use it, for example, when checking whether an object literal can be safely
 * rewritten.
 */
export function getDataPropertiesFromNode(node) {
  if (
    node?.type !== "ObjectExpression" ||
    !node.properties.length ||
    node.properties.some((property) => {
      return (
        property.type !== "Property" ||
        property.kind !== "init" ||
        property.method ||
        property.computed ||
        property.shorthand ||
        property.key.type !== "Identifier" ||
        !isPrimitiveConstant(property.value)
      );
    })
  ) {
    return undefined;
  }
  const names = node.properties.map((property) => {
    return property.key.name;
  });
  return new Set(names).size === names.length ? node.properties : undefined;
}

/**
 * Returns a fresh local collection construction and its operations, or
 * undefined.
 * Use it, for example, when identifying a collection to replace with a literal.
 */
export function getConstructionFromBlock(sourceCode, block, initialType) {
  const owner = block.parent;
  const statements = block.body;
  if (
    owner.type !== "FunctionDeclaration" ||
    owner.async ||
    owner.generator ||
    statements.length < 3 ||
    sourceCode.getCommentsInside(block).length
  ) {
    return undefined;
  }
  const declaration = statements[0];
  const returned = statements.at(-1);
  if (
    declaration.type !== "VariableDeclaration" ||
    !["const", "let", "var"].includes(declaration.kind) ||
    declaration.declarations.length !== 1 ||
    declaration.declarations[0].id.type !== "Identifier" ||
    declaration.declarations[0].init?.type !== initialType ||
    returned.type !== "ReturnStatement" ||
    returned.argument?.type !== "Identifier" ||
    returned.argument.name !== declaration.declarations[0].id.name
  ) {
    return undefined;
  }
  const entry = declaration.declarations[0];
  const variables = sourceCode.getDeclaredVariables(declaration);
  const variable = variables.find((binding) => {
    return binding.identifiers.includes(entry.id);
  });
  if (
    !variable ||
    variable.defs.length !== 1 ||
    sourceCode.getTokens(block).some((token) => {
      return ["eval", "Function"].includes(token.value);
    })
  ) {
    return undefined;
  }
  return { owner, entry, variable, operations: statements.slice(1, -1) };
}

/**
 * Checks whether every non-initializing reference is a permitted read-only
 * identifier.
 * Use it, for example, when deciding whether a collection construction can be
 * rewritten.
 */
export function hasOnlyConstructionReferences(variable, identifiers) {
  return variable.references
    .filter((reference) => {
      return !reference.init;
    })
    .every((reference) => {
      return (
        reference.isReadOnly() && identifiers.includes(reference.identifier)
      );
    });
}

/**
 * Builds a compact or multiline collection literal based on the surrounding
 * line length.
 * Use it, for example, when a fixer replaces a collection construction with a
 * literal.
 */
export function buildCollectionLiteralFromConstruction(
  sourceCode,
  node,
  entries,
  opening,
  closing,
) {
  const compact = `${opening}${entries.join(", ")}${closing}`;
  const lineStart = sourceCode.text.lastIndexOf("\n", node.range[0] - 1) + 1;
  const followingBreak = sourceCode.text.indexOf("\n", node.range[1]);
  const lineEnd = followingBreak < 0 ? sourceCode.text.length : followingBreak;
  const original = sourceCode.text.slice(lineStart, lineEnd);
  const repaired = `${sourceCode.text.slice(lineStart, node.range[0])}${compact}${sourceCode.text.slice(node.range[1], lineEnd)}`;
  const overflows = (text) => {
    return text.split("\n").some((line) => {
      return line.replaceAll("\t", "  ").length > 80;
    });
  };
  if (overflows(original) || !overflows(repaired)) {
    return compact;
  }
  const indent = original.match(/^\s*/)[0];
  return `${opening.trimEnd()}\n${entries
    .map((entry) => {
      return `${indent}  ${entry},`;
    })
    .join("\n")}\n${indent}${closing.trimStart()}`;
}
