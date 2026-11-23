function _getBoundary(node) {
  if (!node || node.type === "Program" || /Function/.test(node.type)) {
    return node;
  }
  return _getBoundary(node.parent);
}

function _hasScopeCollision(scope, variableScope, name) {
  if (!scope || scope.set.has(name)) {
    return true;
  }
  return scope !== variableScope &&
    _hasScopeCollision(scope.upper, variableScope, name);
}

/** Proves direct calls to a unique binding for the three function fixers. */
export function getDirectCallBinding(sourceCode, declaration, functionNode) {
  const declarationIdentifier = declaration.type === "FunctionDeclaration"
    ? declaration.id
    : declaration.declarations[0].id;
  const variables = sourceCode.getDeclaredVariables(declaration)
    .filter((variable) => {
      return variable.identifiers.includes(declarationIdentifier);
    });
  const variable = variables.length === 1 ? variables[0] : undefined;
  if (!variable || variable.defs.length !== 1 ||
    variable.identifiers.length !== 1 || sourceCode.ast.sourceType !== "module") {
    return undefined;
  }
  const references = variable.references.filter((reference) => {
    return !reference.init;
  });
  if (!references.length || references.some((reference) => {
    const identifier = reference.identifier;
    return !reference.isReadOnly() || identifier.parent.type !== "CallExpression" ||
      identifier.parent.callee !== identifier || identifier.parent.optional ||
      (identifier.range[0] >= functionNode.range[0] &&
        identifier.range[1] <= functionNode.range[1]);
  })) {
    return undefined;
  }
  return { variable, references };
}

/** Rejects lexical, reflective, and string contracts before function edits. */
export function hasUnsafeFunctionContract(sourceCode, functionNode, name) {
  return sourceCode.getTokens(sourceCode.ast).some((token) => {
    return ["eval", "Function"].includes(token.value) ||
      ((token.type === "String" || token.type === "Template") &&
        (token.value.includes(name) || token.value.includes("\\"))) ||
      (token.range[0] >= functionNode.range[0] &&
        token.range[1] <= functionNode.range[1] &&
        ["this", "arguments", "super", "target"].includes(token.value));
  });
}

/** Restricts rewrites to calls after initialization in the same activation. */
export function hasOnlyFollowingCalls(binding, declaration) {
  const boundary = _getBoundary(declaration.parent);
  return binding.references.every((reference) => {
    return reference.identifier.range[0] > declaration.range[1] &&
      _getBoundary(reference.identifier.parent) === boundary;
  });
}

/** Keeps edits disjoint even after an inner function changes its syntax. */
export function hasNestedFunctionSyntax(sourceCode, node) {
  return [node.body, ...node.params].some((part) => {
    return sourceCode.getTokens(part).some((token) => {
      return ["function", "=>"].includes(token.value);
    });
  });
}

/** Proves that prefixing a private binding cannot capture another symbol. */
export function hasRenameCollision(sourceCode, binding, name) {
  return binding.variable.scope.set.has(name) ||
    binding.variable.scope.through.some((reference) => {
      return reference.identifier.name === name;
    }) ||
    binding.references.some((reference) => {
      return _hasScopeCollision(sourceCode.getScope(reference.identifier),
        binding.variable.scope, name);
    });
}

/** Leaves concise-arrow normalization to the existing arrow-body rule. */
export function hasArrowBodyBoundary(node) {
  return node.type === "ArrowFunctionExpression" &&
    (node.body.type !== "BlockStatement" ||
      (node.body.body.length === 1 && node.body.body[0].type === "ReturnStatement"));
}

/** Refuses overlapping comment, control-flow, declaration, and type repairs. */
export function hasRepairBoundary(sourceCode, nodes) {
  const start = nodes[0].range[0];
  const end = nodes.at(-1).range[1];
  return sourceCode.getAllComments().some((comment) => {
    return comment.range[0] >= start && comment.range[1] <= end;
  }) || nodes.some((node) => {
    return sourceCode.getTokens(node).some((token) => {
      return token.type === "String" || token.type === "Template" ||
        ["if", "else", "for", "while", "do", "as", "<", "[", "Array",
          "var", "let", "const", "try", "catch", "finally", "class",
          "namespace", "module", "!", "?.", "apply", "..."].includes(token.value);
    });
  });
}

/** Limits conversion to ordinary signatures with no discarded comments. */
export function hasOrdinarySignature(sourceCode, node, prefixStart) {
  return !node.async && !node.generator && !node.typeParameters &&
    !node.declare && node.body && !hasNestedFunctionSyntax(sourceCode, node) &&
    !hasArrowBodyBoundary(node) && !hasRepairBoundary(sourceCode, [node]) &&
    !sourceCode.getAllComments().some((comment) => {
      return comment.range[0] >= prefixStart &&
        comment.range[1] <= node.body.range[0];
    });
}
