import { getRuleMetadataFromIdentity } from "@avandar/lint/metadata";
import {
  buildCollapsedJsdocFromComment,
  getContainingFunctionFromComment,
  getStandaloneLayoutFromComment,
  isDeclarationComment,
} from "./commentSyntax.js";
import { getExportKeyMovesFromProgram } from "./export-key-jsdoc.js";

/**
 * Reports and fixes eligible short JSDoc that can fit on one line.
 * Use it, for example, to keep short prose documentation compact.
 */
const rule = {
  meta: {
    ...getRuleMetadataFromIdentity({
      ruleId: "AF-07",
      documentationPath:
        "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/single-line-doc-comment.md",
    }),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: { singleLine: "AF-07: Keep short, tag-free JSDoc on one line." },
  },
  createOnce: (context) => {
    return {
      Program: (program) => {
        const sourceCode = context.sourceCode;
        const moves = getExportKeyMovesFromProgram(program, sourceCode);
        const movingComments = new Set(
          moves.map((move) => {
            return move.comment.range[0];
          }),
        );
        sourceCode.getAllComments().forEach((comment) => {
          if (
            comment.type !== "Block" ||
            !comment.value.startsWith("*") ||
            !comment.value.includes("\n") ||
            movingComments.has(comment.range[0])
          ) {
            return;
          }
          if (
            getContainingFunctionFromComment(sourceCode, comment) &&
            !isDeclarationComment(sourceCode, comment)
          ) {
            return;
          }
          const layout = getStandaloneLayoutFromComment(sourceCode, comment);
          const replacement =
            layout && buildCollapsedJsdocFromComment(comment, layout.indent);
          if (!replacement) {
            return;
          }
          context.report({
            node: comment,
            messageId: "singleLine",
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
