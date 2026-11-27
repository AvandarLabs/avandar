import { getRuleMetadataFromIdentity } from "@avandar/lint/metadata";

function _isPlainOperand(node) {
  return (
    node.type === "Literal" ||
    (node.type === "Identifier" && !node.name.includes("E2E"))
  );
}

function _isBooleanCondition(node) {
  return (
    (node.type === "UnaryExpression" &&
      node.operator === "!" &&
      _isPlainOperand(node.argument)) ||
    (node.type === "BinaryExpression" &&
      ["===", "!==", "==", "!=", "<", ">", "<=", ">="].includes(
        node.operator,
      ) &&
      _isPlainOperand(node.left) &&
      _isPlainOperand(node.right))
  );
}

function _hasDeclarationOwner(node) {
  if (
    !node ||
    ["Program", "LogicalExpression", "ConditionalExpression"].includes(
      node.type,
    )
  ) {
    return false;
  }
  if (/Function/.test(node.type)) {
    return (
      node.type === "FunctionDeclaration" &&
      (node.parent.type === "Program" ||
        (node.parent.type === "ExportNamedDeclaration" &&
          node.parent.parent.type === "Program"))
    );
  }
  return _hasDeclarationOwner(node.parent);
}

function _hasNewLineOverflow(sourceCode, expression, replacement) {
  const text = sourceCode.text;
  const start = text.lastIndexOf("\n", expression.range[0] - 1) + 1;
  const followingLine = text.indexOf("\n", expression.range[1]);
  const end = followingLine < 0 ? text.length : followingLine;
  const original = text.slice(start, end);
  const repaired = [
    text.slice(start, expression.range[0]),
    replacement,
    text.slice(expression.range[1], end),
  ].join("");
  const hasOverflow = (value) => {
    return value.split("\n").some((line) => {
      return line.replace(/\t/g, "  ").length > 80;
    });
  };
  return !hasOverflow(original) && hasOverflow(repaired);
}

/**
 * Supplies `plugin` with diagnostics and fixes for eligible boolean JSX
 * children,
 * preserving their values when rewriting them as ternaries.
 */
const rule = {
  meta: {
    ...getRuleMetadataFromIdentity({
      ruleId: "avlint-ts-011",
      documentationPath:
        "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/jsx-conditional-ternary.md",
    }),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: {
      ternary: "avlint-ts-011: Use a ternary for this boolean JSX child.",
    },
  },
  createOnce: (context) => {
    return {
      JSXExpressionContainer: (node) => {
        const expression = node.expression;
        if (
          !["JSXElement", "JSXFragment"].includes(node.parent.type) ||
          expression.type !== "LogicalExpression" ||
          expression.operator !== "&&" ||
          !_isBooleanCondition(expression.left) ||
          expression.right.type !== "JSXElement" ||
          !expression.right.openingElement.selfClosing ||
          expression.right.openingElement.attributes.length ||
          expression.right.openingElement.name.type !== "JSXIdentifier" ||
          !_hasDeclarationOwner(node)
        ) {
          return;
        }
        const sourceCode = context.sourceCode;
        if (sourceCode.getCommentsInside(expression).length) {
          return;
        }
        const condition = sourceCode.getText(expression.left);
        const child = sourceCode.getText(expression.right);
        const replacement = `(${condition}) ? ${child} : false`;
        if (_hasNewLineOverflow(sourceCode, expression, replacement)) {
          return;
        }
        context.report({
          node: expression,
          messageId: "ternary",
          fix: (fixer) => {
            return fixer.replaceText(expression, replacement);
          },
        });
      },
    };
  },
};
export default rule;
