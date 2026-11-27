const MODULE_MARKER_TYPES = [
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExportAllDeclaration",
];

/**
 * Reports the coverage seed binding when an original import or export
 * statement precedes it, proving that the reviewed file is an ES module.
 * It matches only the generated seed name, so it never reports authored code.
 */
const rule = {
  meta: {
    type: "problem",
    schema: [],
    messages: { witness: "Module context: original module marker found." },
  },
  createOnce: (context) => {
    return {
      VariableDeclaration: (node) => {
        const identifier = node.declarations[0]?.id;
        if (
          node.parent.type !== "Program" ||
          identifier?.type !== "Identifier" ||
          !/^_avandarCoverage\d+ModuleContext$/.test(identifier.name) ||
          !context.sourceCode.ast.body.some((statement) => {
            return (
              statement.range[0] < node.range[0] &&
              MODULE_MARKER_TYPES.includes(statement.type)
            );
          })
        ) {
          return;
        }
        context.report({ node: identifier, messageId: "witness" });
      },
    };
  },
};
export default rule;
