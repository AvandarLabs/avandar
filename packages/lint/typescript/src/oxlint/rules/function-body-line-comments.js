import { getRuleMetadataFromIdentity } from "@avandar/lint/metadata";
import {
  getContainingFunctionFromComment,
  getProseLinesFromComment,
  getStandaloneLayoutFromComment,
  isDeclarationComment,
} from "./commentSyntax.js";

/**
 * Reports standalone block prose in function bodies and fixes it as line
 * comments.
 * For example, use it when linting function bodies that contain prose comments.
 */
const rule = {
  meta: {
    ...getRuleMetadataFromIdentity({
      ruleId: "avlint-common-001",
      documentationPath:
        "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/no-function-body-doc-comments.md",
    }),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: {
      ordinary:
        "avlint-common-001: Use ordinary line comments inside function bodies.",
    },
  },
  createOnce: (context) => {
    return {
      Program: () => {
        const sourceCode = context.sourceCode;
        sourceCode.getAllComments().forEach((comment) => {
          if (
            comment.type !== "Block" ||
            !getContainingFunctionFromComment(sourceCode, comment) ||
            isDeclarationComment(sourceCode, comment)
          ) {
            return;
          }
          const layout = getStandaloneLayoutFromComment(sourceCode, comment);
          const lines = getProseLinesFromComment(comment);
          if (!layout || !lines) {
            return;
          }
          const replacement = lines
            .map((line) => {
              return line ? `// ${line}` : "//";
            })
            .join(`${layout.newline}${layout.indent}`);
          context.report({
            node: comment,
            messageId: "ordinary",
            fix: (fixer) => {
              return fixer.replaceText(comment, replacement);
            },
          });
        });
      },
    };
  },
};
export default rule;
