import { getRuleMetadataFromIdentity } from "@avandar/lint/metadata";
import {
  buildCollectionLiteralFromConstruction,
  getConstructionFromBlock,
  hasOnlyConstructionReferences,
  isPrimitiveConstant,
} from "./collectionSafety.js";
import { getUtilityImportFromSource } from "./utilityImports.js";

function _isPrimitiveType(node, allowsUndefined) {
  if (!node) {
    return false;
  }
  if (node.type === "TSParenthesizedType") {
    return _isPrimitiveType(node.typeAnnotation, allowsUndefined);
  }
  return (
    [
      "TSNumberKeyword",
      "TSStringKeyword",
      "TSBooleanKeyword",
      "TSNullKeyword",
    ].includes(node.type) ||
    (allowsUndefined && node.type === "TSUndefinedKeyword") ||
    (node.type === "TSLiteralType" && isPrimitiveConstant(node.literal)) ||
    (node.type === "TSUnionType" &&
      node.types.every((type) => {
        return _isPrimitiveType(type, allowsUndefined);
      }))
  );
}

function _getElementType(identifier) {
  const annotation = identifier.typeAnnotation?.typeAnnotation;
  if (annotation?.type === "TSArrayType") {
    return annotation.elementType;
  }
  if (
    annotation?.type === "TSTypeReference" &&
    annotation.typeName.type === "Identifier" &&
    annotation.typeName.name === "Array" &&
    annotation.typeArguments?.params.length === 1
  ) {
    return annotation.typeArguments.params[0];
  }
  return undefined;
}

function _getCandidate(statement, construction) {
  const test = statement.test;
  const consequent = statement.consequent;
  const push = consequent?.body?.[0]?.expression;
  if (
    statement.type !== "IfStatement" ||
    statement.alternate ||
    test.type !== "BinaryExpression" ||
    test.operator !== "!==" ||
    test.left.type !== "Identifier" ||
    test.right.type !== "Identifier" ||
    test.right.name !== "undefined" ||
    !construction.owner.params.some((parameter) => {
      return (
        parameter.type === "Identifier" && parameter.name === test.left.name
      );
    }) ||
    consequent.type !== "BlockStatement" ||
    consequent.body.length !== 1 ||
    consequent.body[0].loc.start.line === consequent.loc.start.line ||
    push?.type !== "CallExpression" ||
    push.optional ||
    push.arguments.length !== 1 ||
    push.arguments[0].type !== "Identifier" ||
    push.arguments[0].name !== test.left.name ||
    push.callee.type !== "MemberExpression" ||
    push.callee.optional ||
    push.callee.computed ||
    push.callee.object.type !== "Identifier" ||
    push.callee.object.name !== construction.entry.id.name ||
    push.callee.property.name !== "push"
  ) {
    return undefined;
  }
  return { name: test.left.name, identifier: push.callee.object };
}

function _hasLocalBinding(scope, name) {
  return Boolean(
    scope &&
    (scope.set.get(name)?.defs.length || _hasLocalBinding(scope.upper, name)),
  );
}

function _getArrayPlan(sourceCode, block) {
  const construction = getConstructionFromBlock(
    sourceCode,
    block,
    "ArrayExpression",
  );
  if (
    !construction ||
    construction.owner.typeParameters ||
    construction.entry.init.elements.length ||
    !_isPrimitiveType(_getElementType(construction.entry.id), false) ||
    construction.owner.params.some((parameter) => {
      return (
        parameter.type !== "Identifier" ||
        parameter.name === "undefined" ||
        !_isPrimitiveType(parameter.typeAnnotation?.typeAnnotation, true)
      );
    })
  ) {
    return undefined;
  }
  if (
    _hasLocalBinding(sourceCode.getScope(block), "undefined") ||
    _hasLocalBinding(sourceCode.getScope(block), "Array")
  ) {
    return undefined;
  }
  const candidates = construction.operations.map((operation) => {
    return _getCandidate(operation, construction);
  });
  if (
    candidates.some((candidate) => {
      return !candidate;
    }) ||
    !hasOnlyConstructionReferences(construction.variable, [
      ...candidates.map((candidate) => {
        return candidate.identifier;
      }),
      block.body.at(-1).argument,
    ])
  ) {
    return undefined;
  }
  return { ...construction, candidates };
}

function _getUnionMemberTexts(sourceCode, node) {
  if (node.type === "TSParenthesizedType") {
    return _getUnionMemberTexts(sourceCode, node.typeAnnotation);
  }
  return node.type === "TSUnionType"
    ? node.types.flatMap((type) => {
        return _getUnionMemberTexts(sourceCode, type);
      })
    : [sourceCode.getText(node)];
}

function _preservesReturnType(sourceCode, plan) {
  if (plan.owner.returnType) {
    return true;
  }
  // Without a declared return type, the fixed literal's inferred element type
  // must match the removed array annotation exactly.
  const elementTexts = new Set(
    _getUnionMemberTexts(sourceCode, _getElementType(plan.entry.id)),
  );
  const candidateTexts = new Set(
    plan.candidates.flatMap((candidate) => {
      const parameter = plan.owner.params.find((param) => {
        return param.name === candidate.name;
      });
      return _getUnionMemberTexts(
        sourceCode,
        parameter.typeAnnotation.typeAnnotation,
      ).filter((text) => {
        return text !== "undefined";
      });
    }),
  );
  return (
    elementTexts.size === candidateTexts.size &&
    [...elementTexts].every((text) => {
      return candidateTexts.has(text);
    })
  );
}

/**
 * Reports eligible optional-parameter array construction and offers a direct
 * literal fix: a ternary for one candidate, a filtered array for several.
 * Used, for example, when linting TypeScript functions that accumulate defined
 * parameters.
 */
const rule = {
  meta: {
    ...getRuleMetadataFromIdentity({
      ruleId: "avlint-ts-014",
      documentationPath:
        "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/optional-array-candidates.md",
    }),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: {
      candidates: "avlint-ts-014: Filter these exact optional candidates.",
    },
  },
  createOnce: (context) => {
    return {
      BlockStatement: (node) => {
        if (!/\.tsx?$/.test(context.filename)) {
          return;
        }
        const sourceCode = context.sourceCode;
        const plan = _getArrayPlan(sourceCode, node);
        if (!plan || !_preservesReturnType(sourceCode, plan)) {
          return;
        }
        const isSingle = plan.candidates.length === 1;
        const imported =
          !isSingle &&
          getUtilityImportFromSource(
            sourceCode,
            node,
            "isDefined",
            context.filename,
          );
        if (!isSingle && (!imported || imported.hasEdits)) {
          return;
        }
        const names = plan.candidates.map((candidate) => {
          return candidate.name;
        });
        const returned = node.body.at(-1).argument;
        context.report({
          node: returned,
          messageId: "candidates",
          fix: (fixer) => {
            return [
              fixer.replaceText(
                returned,
                isSingle
                  ? `${names[0]} !== undefined ? [${names[0]}] : []`
                  : buildCollectionLiteralFromConstruction(
                      sourceCode,
                      returned,
                      names,
                      "[",
                      `].filter(${imported.localName})`,
                    ),
              ),
              fixer.removeRange([
                node.body[0].range[0],
                node.body.at(-1).range[0],
              ]),
            ];
          },
        });
      },
    };
  },
};
export default rule;
