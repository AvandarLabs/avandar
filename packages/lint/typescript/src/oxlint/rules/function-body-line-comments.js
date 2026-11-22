import { createRuleMetadata } from "@avandar/lint/metadata";
import {
  getContainingFunction,
  getProseLines,
  getStandaloneLayout,
  isDeclarationComment,
} from "./commentSyntax.js";

/** Converts standalone body prose while preserving declaration docs. */
const rule = {
  meta: {
    ...createRuleMetadata(
      "AF-06",
      "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/no-function-body-doc-comments.md",
    ),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: { ordinary: "AF-06: Use ordinary line comments inside function bodies." },
  },
  createOnce(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode;
        sourceCode.getAllComments().forEach((comment) => {
          if (comment.type !== "Block" || !getContainingFunction(sourceCode, comment) ||
            isDeclarationComment(sourceCode, comment)) {
            return;
          }
          const layout = getStandaloneLayout(sourceCode, comment);
          const lines = getProseLines(comment);
          if (!layout || !lines) {
            return;
          }
          const replacement = lines.map((line) => {
            return line ? `// ${line}` : "//";
          }).join(layout.newline + layout.indent);
          context.report({ node: comment, messageId: "ordinary", fix(fixer) {
            return fixer.replaceText(comment, replacement);
          } });
        });
      },
    };
  },
};
export default rule;
