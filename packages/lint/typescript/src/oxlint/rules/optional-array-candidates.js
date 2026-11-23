import { createRuleMetadata } from "@avandar/lint/metadata";
import { buildCollectionLiteral, getConstruction, hasOnlyConstructionReferences,
  isPrimitiveConstant } from "./collectionSafety.js";
import { getUtilityImport } from "./utilityImports.js";

function _isPrimitiveType(node, allowsUndefined) {
  if (!node) {
    return false;
  }
  if (node.type === "TSParenthesizedType") {
    return _isPrimitiveType(node.typeAnnotation, allowsUndefined);
  }
  return ["TSNumberKeyword", "TSStringKeyword", "TSBooleanKeyword",
    "TSNullKeyword"].includes(node.type) ||
    (allowsUndefined && node.type === "TSUndefinedKeyword") ||
    (node.type === "TSLiteralType" && isPrimitiveConstant(node.literal)) ||
    (node.type === "TSUnionType" && node.types.every((type) => {
      return _isPrimitiveType(type, allowsUndefined);
    }));
}

function _getElementType(identifier) {
  const annotation = identifier.typeAnnotation?.typeAnnotation;
  if (annotation?.type === "TSArrayType") {
    return annotation.elementType;
  }
  if (annotation?.type === "TSTypeReference" &&
    annotation.typeName.type === "Identifier" &&
    annotation.typeName.name === "Array" &&
    annotation.typeArguments?.params.length === 1) {
    return annotation.typeArguments.params[0];
  }
  return undefined;
}

function _getCandidate(statement, construction) {
  const test = statement.test;
  const consequent = statement.consequent;
  const push = consequent?.body?.[0]?.expression;
  if (statement.type !== "IfStatement" || statement.alternate ||
    test.type !== "BinaryExpression" || test.operator !== "!==" ||
    test.left.type !== "Identifier" || test.right.type !== "Identifier" ||
    test.right.name !== "undefined" ||
    !construction.owner.params.some((parameter) => {
      return parameter.type === "Identifier" && parameter.name === test.left.name;
    }) || consequent.type !== "BlockStatement" ||
    consequent.body.length !== 1 ||
    consequent.body[0].loc.start.line === consequent.loc.start.line ||
    push?.type !== "CallExpression" ||
    push.optional || push.arguments.length !== 1 ||
    push.arguments[0].type !== "Identifier" ||
    push.arguments[0].name !== test.left.name ||
    push.callee.type !== "MemberExpression" || push.callee.optional ||
    push.callee.computed || push.callee.object.type !== "Identifier" ||
    push.callee.object.name !== construction.entry.id.name ||
    push.callee.property.name !== "push") {
    return undefined;
  }
  return { name: test.left.name, identifier: push.callee.object };
}

function _hasUndefinedBinding(scope) {
  return Boolean(scope && (scope.set.get("undefined")?.defs.length ||
    _hasUndefinedBinding(scope.upper)));
}

function _getArrayPlan(sourceCode, block) {
  const construction = getConstruction(sourceCode, block, "ArrayExpression");
  if (!construction || construction.owner.typeParameters ||
    construction.entry.init.elements.length ||
    !_isPrimitiveType(_getElementType(construction.entry.id), false) ||
    construction.owner.params.some((parameter) => {
      return parameter.type !== "Identifier" || parameter.name === "undefined" ||
        !_isPrimitiveType(parameter.typeAnnotation?.typeAnnotation, true);
    })) {
    return undefined;
  }
  if (_hasUndefinedBinding(sourceCode.getScope(block))) {
    return undefined;
  }
  const candidates = construction.operations.map((operation) => {
    return _getCandidate(operation, construction);
  });
  if (candidates.some((candidate) => { return !candidate; }) ||
    !hasOnlyConstructionReferences(construction.variable,
      [...candidates.map((candidate) => { return candidate.identifier; }),
        block.body.at(-1).argument])) {
    return undefined;
  }
  return { ...construction, candidates };
}

/** Collects defined local parameters while retaining null values. */
const rule = {
  meta: {
    ...createRuleMetadata("AF-17", "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/optional-array-candidates.md"),
    type: "suggestion", fixable: "code", schema: [],
    messages: { candidates: "AF-17: Filter these exact optional candidates." },
  },
  createOnce(context) {
    return { BlockStatement(node) {
      if (!/\.tsx?$/.test(context.filename)) {
        return;
      }
      const sourceCode = context.sourceCode;
      const plan = _getArrayPlan(sourceCode, node);
      const imported = plan && getUtilityImport(sourceCode, node,
        "isDefined", context.filename);
      if (!imported || imported.hasEdits) {
        return;
      }
      const names = [`...${plan.entry.id.name}`,
        ...plan.candidates.map((candidate) => { return candidate.name; })];
      const returned = node.body.at(-1).argument;
      context.report({ node: returned, messageId: "candidates", fix(fixer) {
        return [fixer.replaceText(returned,
          buildCollectionLiteral(sourceCode, returned, names,
            "[", `].filter(${imported.localName})`)),
        ...plan.operations.map((operation) => {
          return fixer.remove(operation);
        })];
      } });
    } };
  },
};
export default rule;
