import { getRuleMetadataFromIdentity } from "@avandar/lint/metadata";
import {
  hasRenameCollision,
  hasUnsafeFunctionContract,
} from "./functionSafety.js";

function _getReadStatement(node) {
  const container = node.parent;
  if (container.type === "Program") {
    const statement = container.body[container.body.indexOf(node) + 1];
    return statement?.type === "ExpressionStatement" ? statement : undefined;
  }
  const owner = container.parent;
  return container.type === "BlockStatement" &&
    container.body.length === 2 &&
    container.body[0] === node &&
    container.body[1].type === "ReturnStatement" &&
    owner.type === "FunctionDeclaration" &&
    owner.parent.type === "ExportNamedDeclaration" &&
    owner.parent.parent.type === "Program"
    ? container.body[1]
    : undefined;
}

function _getBinding(sourceCode, node, identifier, statement, name) {
  const variable = sourceCode.getDeclaredVariables(node).find((candidate) => {
    return candidate.identifiers.includes(identifier);
  });
  const references = variable?.references.filter((reference) => {
    return !reference.init;
  });
  if (
    !variable ||
    variable.defs.length !== 1 ||
    !references?.length ||
    references.some((reference) => {
      const use = reference.identifier;
      return (
        !reference.isReadOnly() ||
        use.range[0] < statement.range[0] ||
        use.range[1] > statement.range[1] ||
        ["Property", "MemberExpression", "ExportSpecifier"].includes(
          use.parent.type,
        )
      );
    })
  ) {
    return undefined;
  }
  const binding = { variable, references };
  return hasRenameCollision(sourceCode, binding, name) ||
    hasUnsafeFunctionContract(sourceCode, node, identifier.name)
    ? undefined
    : binding;
}

function _getPrimitiveIdentifier(node) {
  if (node.kind !== "const" || node.declarations.length !== 1) {
    return undefined;
  }
  const declaration = node.declarations[0];
  const identifier = declaration.id;
  return identifier.type === "Identifier" &&
    /E2E(?=[A-Z]|$)/.test(identifier.name) &&
    !/^[A-Z0-9_]+$/.test(identifier.name) &&
    declaration.init?.type === "Literal" &&
    !declaration.init.regex &&
    (!identifier.typeAnnotation ||
      ["TSNumberKeyword", "TSStringKeyword", "TSBooleanKeyword"].includes(
        identifier.typeAnnotation.typeAnnotation.type,
      ))
    ? identifier
    : undefined;
}

function _getRenameCandidate(sourceCode, node) {
  const identifier = _getPrimitiveIdentifier(node);
  if (
    !identifier ||
    !sourceCode.ast.body.some((statement) => {
      return (
        statement.range[0] < node.range[0] &&
        [
          "ImportDeclaration",
          "ExportNamedDeclaration",
          "ExportDefaultDeclaration",
          "ExportAllDeclaration",
        ].includes(statement.type)
      );
    })
  ) {
    return undefined;
  }
  const statement = _getReadStatement(node);
  if (
    !statement ||
    sourceCode.getTokens(statement).some((token) => {
      return ["=>", "function", "as", "<", "[", "!", "?.", "..."].includes(
        token.value,
      );
    }) ||
    sourceCode.getAllComments().some((comment) => {
      return (
        comment.range[0] >= node.range[0] &&
        comment.range[1] <= statement.range[1]
      );
    })
  ) {
    return undefined;
  }
  const name = identifier.name.replace(/E2E(?=[A-Z]|$)/g, "E2e");
  const binding = _getBinding(sourceCode, node, identifier, statement, name);
  return binding ? { identifier, name, binding } : undefined;
}

/**
 * Reports and fixes E2E casing in eligible private primitive bindings.
 * For example, Oxlint can rename an eligible local binding to use E2e.
 */
const rule = {
  meta: {
    ...getRuleMetadataFromIdentity({
      ruleId: "AF-13",
      documentationPath:
        "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/local-e2e-casing.md",
    }),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: { rename: "AF-13: Use E2e casing in this local binding." },
  },
  createOnce: (context) => {
    return {
      VariableDeclaration: (node) => {
        const candidate = _getRenameCandidate(context.sourceCode, node);
        if (!candidate) {
          return;
        }
        const { identifier, name, binding } = candidate;
        context.report({
          node: identifier,
          messageId: "rename",
          fix: (fixer) => {
            return [
              identifier,
              ...binding.references.map((reference) => {
                return reference.identifier;
              }),
            ].map((use) => {
              return fixer.replaceText(use, name);
            });
          },
        });
      },
    };
  },
};
export default rule;
