import { createRuleMetadata } from "@avandar/lint/metadata";
import {
  getDirectCallBinding, hasArrowBodyBoundary, hasNestedFunctionSyntax,
  hasRenameCollision, hasRepairBoundary, hasUnsafeFunctionContract,
} from "./functionSafety.js";

function _getHelper(node) {
  if (node.type === "FunctionDeclaration" && node.body) {
    return { identifier: node.id, functionNode: node };
  }
  if (node.type === "VariableDeclaration" && node.kind === "const" &&
    node.declarations.length === 1) {
    const declaration = node.declarations[0];
    if (declaration.id.type === "Identifier" &&
      ["ArrowFunctionExpression", "FunctionExpression"].includes(declaration.init?.type) &&
      !declaration.init.id) {
      return { identifier: declaration.id, functionNode: declaration.init };
    }
  }
  return undefined;
}

/** Prefixes private helpers only when every symbol use is a direct call. */
const rule = {
  meta: {
    ...createRuleMetadata("AF-10", "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/private-helper-prefix.md"),
    type: "suggestion", fixable: "code", schema: [],
    messages: { prefix: "AF-10: Prefix a private top-level helper with an underscore." },
  },
  createOnce(context) {
    return { Program(program) {
      const sourceCode = context.sourceCode;
      program.body.forEach((node, index) => {
        const helper = _getHelper(node);
        if (!helper?.identifier || !/^[a-z]/.test(helper.identifier.name)) {
          return;
        }
        const name = helper.identifier.name;
        const caller = program.body[index + 1];
        const callerFunction = caller?.type === "ExportNamedDeclaration" &&
          caller.declaration;
        if (callerFunction?.type !== "FunctionDeclaration" ||
          !callerFunction.body ||
          hasNestedFunctionSyntax(sourceCode, callerFunction) ||
          hasArrowBodyBoundary(helper.functionNode) ||
          hasRepairBoundary(sourceCode,
            [helper.functionNode, callerFunction])) {
          return;
        }
        const binding = getDirectCallBinding(sourceCode, node,
          helper.functionNode);
        if (!binding || binding.references.some((reference) => {
            return reference.identifier.range[0] <
              callerFunction.body.range[0] ||
              reference.identifier.range[1] > callerFunction.body.range[1];
          }) ||
          hasNestedFunctionSyntax(sourceCode, helper.functionNode) ||
          hasRenameCollision(sourceCode, binding, `_${name}`) ||
          hasUnsafeFunctionContract(sourceCode, helper.functionNode, name)) {
          return;
        }
        context.report({ node: helper.identifier, messageId: "prefix", fix(fixer) {
          return [helper.identifier, ...binding.references.map((reference) => {
            return reference.identifier;
          })].map((identifier) => { return fixer.replaceText(identifier, `_${name}`); });
        } });
      });
    } };
  },
};
export default rule;
