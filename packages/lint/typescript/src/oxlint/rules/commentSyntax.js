/** Returns exact prose lines, rejecting directives and structured markup. */
export function getProseLines(comment) {
  const value = comment.value.replace(/^\*/, "");
  if (/[\u2028\u2029]|\r(?!\n)/.test(value) ||
    /^\s*(?:globals?|exported|jshint|jslint)\b|sourceURL/.test(value)) {
    return undefined;
  }
  if (/@|eslint|istanbul|\bc8\b|prettier|webpack|vite|sourceMappingURL|#__/i.test(value)) {
    return undefined;
  }
  const lines = value.split(/\r?\n/);
  if (lines.length === 1) {
    return lines[0].trim() ? [lines[0].trim()] : undefined;
  }
  if (lines[0].trim() || lines.at(-1).trim()) {
    return undefined;
  }
  const content = lines.slice(1, -1).map((line) => {
    const match = /^\s*\*(?: ?)(.*)$/.exec(line);
    return match?.[1];
  });
  return content.length && content.every((line) => {
    return line !== undefined;
  })
    ? content
    : undefined;
}

/** Preserves formatted prose unless one complete documentation line fits. */
export function getCollapsedJsdoc(comment, indent) {
  const lines = getProseLines(comment);
  if (!lines || lines.some((line) => {
    return !line.trim() || line.endsWith("\\") ||
      /\s$|^\s|^[-+*#>]|^\d+\.|```|<\/?(?:pre|code)\b/.test(line);
  })) {
    return undefined;
  }
  const replacement = `/** ${lines.join(" ")} */`;
  return (indent + replacement).replace(/\t/g, "  ").length <= 80
    ? replacement : undefined;
}

/** Whole-line comments can become line comments without consuming code. */
export function getStandaloneLayout(
  sourceCode, node, hasTrailingComma = false,
) {
  const text = sourceCode.text;
  const start = text.lastIndexOf("\n", node.range[0] - 1) + 1;
  const end = text.indexOf("\n", node.range[1]);
  const indent = text.slice(start, node.range[0]);
  const suffix = text.slice(node.range[1], end < 0 ? text.length : end);
  return /^[\t ]*$/.test(indent) &&
    (hasTrailingComma ? /^,?[\t \r]*$/ : /^[\t \r]*$/).test(suffix)
    ? { indent, newline: text.includes("\r\n") ? "\r\n" : "\n" }
    : undefined;
}

/** Finds the function body containing a comment, excluding parameter lists. */
export function getContainingFunction(sourceCode, comment) {
  let node = sourceCode.getNodeByRangeIndex(comment.range[0]);
  while (node) {
    if (/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)) {
      return node.body.range[0] < comment.range[0] &&
        comment.range[1] < node.body.range[1] ? node : undefined;
    }
    node = node.parent;
  }
  return undefined;
}

/** Keeps declaration documentation attached to nested identifiers. */
export function isDeclarationComment(sourceCode, comment) {
  const token = sourceCode.getTokenAfter(comment);
  let node = token && sourceCode.getNodeByRangeIndex(token.range[0]);
  while (node && node.range[0] === token.range[0]) {
    if (/Declaration$|^(Property|MethodDefinition|PropertyDefinition|AccessorProperty|TSPropertySignature|TSMethodSignature|TSEnumMember|TSAbstractMethodDefinition|TSAbstractPropertyDefinition)$/.test(node.type)) {
      return /^\s*$/.test(sourceCode.text.slice(comment.range[1], node.range[0]));
    }
    node = node.parent;
  }
  return false;
}
