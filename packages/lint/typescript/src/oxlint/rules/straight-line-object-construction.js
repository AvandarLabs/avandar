import { getRuleMetadataFromIdentity } from "@avandar/lint/metadata";
import {
  buildCollectionLiteralFromConstruction,
  getConstructionFromBlock,
  getDataPropertiesFromNode,
  hasOnlyConstructionReferences,
  isPrimitiveConstant,
} from "./collectionSafety.js";

function _getAssignment(statement, name) {
  const assignment =
    statement.type === "ExpressionStatement" ? statement.expression : undefined;
  const member = assignment?.left;
  if (
    assignment?.type !== "AssignmentExpression" ||
    assignment.operator !== "=" ||
    member.type !== "MemberExpression" ||
    member.computed ||
    member.optional ||
    member.object.type !== "Identifier" ||
    member.object.name !== name ||
    member.property.type !== "Identifier" ||
    member.property.name === "__proto__" ||
    !isPrimitiveConstant(assignment.right)
  ) {
    return undefined;
  }
  return {
    key: member.property.name,
    value: assignment.right,
    identifier: member.object,
  };
}

function _getObjectPlan(sourceCode, block) {
  const construction = getConstructionFromBlock(
    sourceCode,
    block,
    "ObjectExpression",
  );
  const properties = getDataPropertiesFromNode(construction?.entry.init);
  if (!construction || construction.entry.id.typeAnnotation || !properties) {
    return undefined;
  }
  const assignments = construction.operations.map((operation) => {
    return _getAssignment(operation, construction.entry.id.name);
  });
  const hasNullPrototype = properties.some((property) => {
    return property.key.name === "__proto__" && property.value.value === null;
  });
  if (
    assignments.some((assignment) => {
      return (
        !assignment ||
        (!hasNullPrototype &&
          !properties.some((property) => {
            return property.key.name === assignment.key;
          }))
      );
    }) ||
    new Set(
      assignments.map((assignment) => {
        return assignment.key;
      }),
    ).size !== assignments.length ||
    !hasOnlyConstructionReferences(construction.variable, [
      ...assignments.map((assignment) => {
        return assignment.identifier;
      }),
      block.body.at(-1).argument,
    ])
  ) {
    return undefined;
  }
  return { ...construction, properties, assignments, hasNullPrototype };
}

/**
 * Reports and fixes eligible unobserved writes to fresh data objects.
 * For example, an Oxlint run can suggest constructing the returned object
 * directly.
 */
const rule = {
  meta: {
    ...getRuleMetadataFromIdentity({
      ruleId: "AF-16",
      documentationPath:
        "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/straight-line-object-construction.md",
    }),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: { object: "AF-16: Construct this fresh data object directly." },
  },
  createOnce: (context) => {
    return {
      BlockStatement: (node) => {
        const sourceCode = context.sourceCode;
        const plan = _getObjectPlan(sourceCode, node);
        if (!plan) {
          return;
        }
        const properties = [
          ...(plan.hasNullPrototype ? ["__proto__: null"] : []),
          `...${plan.entry.id.name}`,
          ...plan.assignments.map((assignment) => {
            return `${assignment.key}: ${sourceCode.getText(assignment.value)}`;
          }),
        ];
        const returned = node.body.at(-1).argument;
        context.report({
          node: returned,
          messageId: "object",
          fix: (fixer) => {
            return [
              fixer.replaceText(
                returned,
                buildCollectionLiteralFromConstruction(
                  sourceCode,
                  returned,
                  properties,
                  "{ ",
                  " }",
                ),
              ),
              ...plan.operations.map((operation) => {
                return fixer.remove(operation);
              }),
            ];
          },
        });
      },
    };
  },
};
export default rule;
