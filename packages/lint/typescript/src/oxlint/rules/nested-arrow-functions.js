import { getRuleMetadataFromIdentity } from "@avandar/lint/metadata";
import {
  getDirectCallBindingFromDeclaration,
  hasOnlyFollowingCalls,
  hasOrdinarySignature,
  hasUnsafeFunctionContract,
} from "./functionSafety.js";

/**
 * Reports eligible nested function declarations and offers an arrow-function
 * fix.
 * For example, use this rule when linting nested declarations with direct
 * calls.
 */
const rule = {
  meta: {
    ...getRuleMetadataFromIdentity({
      ruleId: "avlint-ts-007",
      documentationPath:
        "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/nested-arrow-function.md",
    }),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: { arrow: "avlint-ts-007: Use an arrow for a nested function." },
  },
  createOnce: (context) => {
    return {
      FunctionDeclaration: (node) => {
        const sourceCode = context.sourceCode;
        if (
          !node.id ||
          node.parent.type !== "BlockStatement" ||
          node.returnType?.typeAnnotation?.asserts ||
          !/Function/.test(node.parent.parent?.type) ||
          node.parent.parent.body !== node.parent ||
          !hasOrdinarySignature(sourceCode, node, node.range[0])
        ) {
          return;
        }
        const binding = getDirectCallBindingFromDeclaration(
          sourceCode,
          node,
          node,
        );
        if (
          !binding ||
          !hasOnlyFollowingCalls(binding, node) ||
          hasUnsafeFunctionContract(sourceCode, node, node.id.name)
        ) {
          return;
        }
        const signature = sourceCode.text
          .slice(node.id.range[1], node.body.range[0])
          .trim();
        context.report({
          node,
          messageId: "arrow",
          fix: (fixer) => {
            return fixer.replaceText(
              node,
              `const ${node.id.name} = ${signature} => ${sourceCode.getText(node.body)};`,
            );
          },
        });
      },
    };
  },
};
export default rule;
