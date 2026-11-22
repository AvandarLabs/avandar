import { createRuleMetadata } from "@avandar/lint/metadata";
import {
  getContainingFunction,
  getCollapsedJsdoc,
  getStandaloneLayout,
  isDeclarationComment,
} from "./commentSyntax.js";
import { getExportKeyMoves } from "./export-key-jsdoc.js";

/** Collapses plain documentation only when the complete line fits its width. */
const rule = {
  meta: {
    ...createRuleMetadata(
      "AF-07",
      "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/single-line-doc-comment.md",
    ),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: { singleLine: "AF-07: Keep short, tag-free JSDoc on one line." },
  },
  createOnce(context) {
    return {
      Program(program) {
        const sourceCode = context.sourceCode;
        const moves = getExportKeyMoves(program, sourceCode);
        const movingComments = new Set(moves.map((move) => {
          return move.comment.range[0];
        }));
        sourceCode.getAllComments().forEach((comment) => {
          if (comment.type !== "Block" || !comment.value.startsWith("*") ||
            !comment.value.includes("\n") || movingComments.has(comment.range[0])) {
            return;
          }
          if (getContainingFunction(sourceCode, comment) &&
            !isDeclarationComment(sourceCode, comment)) {
            return;
          }
          const layout = getStandaloneLayout(sourceCode, comment);
          const replacement = layout &&
            getCollapsedJsdoc(comment, layout.indent);
          if (!replacement) {
            return;
          }
          context.report({ node: comment, messageId: "singleLine", fix(fixer) {
            return fixer.replaceText(comment, replacement);
          } });
        });
      },
    };
  },
};
export default rule;
