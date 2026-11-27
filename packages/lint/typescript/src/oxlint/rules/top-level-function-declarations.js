import { getRuleMetadataFromIdentity } from "@avandar/lint/metadata";
import {
  getDirectCallBindingFromDeclaration,
  hasOnlyFollowingCalls,
  hasOrdinarySignature,
  hasUnsafeFunctionContract,
} from "./functionSafety.js";

function _getReplacement(sourceCode, declaration) {
  const binding = declaration.declarations[0];
  const node = binding.init;
  if (
    binding.id.type !== "Identifier" ||
    binding.id.typeAnnotation ||
    !["ArrowFunctionExpression", "FunctionExpression"].includes(node?.type) ||
    node.id ||
    !hasOrdinarySignature(sourceCode, node, declaration.range[0])
  ) {
    return undefined;
  }
  const symbol = getDirectCallBindingFromDeclaration(
    sourceCode,
    declaration,
    node,
  );
  if (
    !symbol ||
    !hasOnlyFollowingCalls(symbol, declaration) ||
    hasUnsafeFunctionContract(sourceCode, node, binding.id.name)
  ) {
    return undefined;
  }
  if (node.type === "FunctionExpression") {
    return `function ${binding.id.name}${sourceCode.getText(node).slice(8)}`;
  }
  const arrow = sourceCode
    .getTokens(node)
    .filter((token) => {
      return token.value === "=>" && token.range[1] <= node.body.range[0];
    })
    .at(-1);
  if (!arrow) {
    return undefined;
  }
  const signature = sourceCode.text.slice(node.range[0], arrow.range[0]).trim();
  const parameters = signature.startsWith("(") ? signature : `(${signature})`;
  const body = sourceCode.getText(node.body);
  return `function ${binding.id.name}${parameters} ${body}`;
}

/**
 * Reports and fixes eligible private top-level function expressions as
 * declarations.
 * For example, Oxlint can apply the fix to a binding used only by later direct
 * calls.
 */
const rule = {
  meta: {
    ...getRuleMetadataFromIdentity({
      ruleId: "avlint-ts-006",
      documentationPath:
        "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/top-level-function-declaration.md",
    }),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: {
      declaration: "avlint-ts-006: Use a top-level function declaration.",
    },
  },
  createOnce: (context) => {
    return {
      VariableDeclaration: (node) => {
        if (
          node.parent.type !== "Program" ||
          node.kind !== "const" ||
          node.declarations.length !== 1
        ) {
          return;
        }
        const replacement = _getReplacement(context.sourceCode, node);
        if (replacement) {
          context.report({
            node,
            messageId: "declaration",
            fix: (fixer) => {
              return fixer.replaceText(node, replacement);
            },
          });
        }
      },
    };
  },
};
export default rule;
