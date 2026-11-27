import { getRuleMetadataFromIdentity } from "@avandar/lint/metadata";
import { hasRenameCollision } from "./functionSafety.js";

const ERROR_SUFFIX = "Error";

function _getSuperclassName(node) {
  const superClass = node.superClass;
  if (superClass?.type === "Identifier") {
    return superClass.name;
  }
  return superClass?.type === "MemberExpression" &&
    !superClass.computed &&
    superClass.property.type === "Identifier"
    ? superClass.property.name
    : undefined;
}

function _isEscapingReference(reference) {
  const use = reference.identifier;
  const parent = use.parent;
  return (
    ["ExportSpecifier", "ExportDefaultDeclaration"].includes(parent.type) ||
    (parent.type === "Property" && parent.shorthand) ||
    (parent.type === "MemberExpression" &&
      parent.object === use &&
      (parent.computed ||
        parent.property.name === "name" ||
        parent.property.name === "constructor"))
  );
}

function _hasStringContract(sourceCode, name) {
  return sourceCode.getTokens(sourceCode.ast).some((token) => {
    return (
      (["String", "Template"].includes(token.type) &&
        token.value.includes(name)) ||
      ["eval", "Function"].includes(token.value)
    );
  });
}

function _getRenameBinding(sourceCode, node, newName) {
  if (
    node.type !== "ClassDeclaration" ||
    node.parent.type !== "Program" ||
    sourceCode.ast.sourceType !== "module"
  ) {
    return undefined;
  }
  const variable = sourceCode.getDeclaredVariables(node).find((candidate) => {
    return candidate.identifiers.includes(node.id);
  });
  const references = variable?.references ?? [];
  const binding = { variable, references };
  return !variable ||
    variable.defs.length !== 1 ||
    references.some(_isEscapingReference) ||
    _hasStringContract(sourceCode, node.id.name) ||
    hasRenameCollision(sourceCode, binding, newName)
    ? undefined
    : binding;
}

/**
 * Reports classes that extend `Error`, or any class whose name ends in
 * `Error`, without an `Error` suffix of their own. Module-private classes are
 * renamed in place when every reference stays inside the file.
 */
const rule = {
  meta: {
    ...getRuleMetadataFromIdentity({
      ruleId: "AF-22",
      documentationPath:
        "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/error-class-suffix.md",
    }),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: {
      suffix: "AF-22: Name this Error subclass `{{name}}`.",
    },
  },
  createOnce: (context) => {
    const check = (node) => {
      const superclassName = _getSuperclassName(node);
      if (
        !node.id ||
        !superclassName?.endsWith(ERROR_SUFFIX) ||
        node.id.name.endsWith(ERROR_SUFFIX)
      ) {
        return;
      }
      const newName = `${node.id.name}${ERROR_SUFFIX}`;
      const binding = _getRenameBinding(context.sourceCode, node, newName);
      context.report({
        node: node.id,
        messageId: "suffix",
        data: { name: newName },
        fix: binding
          ? (fixer) => {
              return [
                node.id,
                ...binding.references.map((reference) => {
                  return reference.identifier;
                }),
              ].map((identifier) => {
                return fixer.replaceText(identifier, newName);
              });
            }
          : null,
      });
    };
    return { ClassDeclaration: check, ClassExpression: check };
  },
};
export default rule;
