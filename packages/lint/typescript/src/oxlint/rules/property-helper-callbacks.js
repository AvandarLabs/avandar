import { createRuleMetadata } from "@avandar/lint/metadata";
import { getDataProperties, isPrimitiveConstant } from "./collectionSafety.js";
import { getUtilityImport } from "./utilityImports.js";

function _getCallbackShape(call) {
  const method = call.callee;
  const callback = call.arguments[0];
  if (call.optional || call.arguments.length !== 1 ||
    method.type !== "MemberExpression" || method.computed || method.optional ||
    !["map", "filter"].includes(method.property.name) ||
    method.object.type !== "ArrayExpression" || !method.object.elements.length ||
    callback?.type !== "FunctionExpression" || callback.id || callback.async ||
    callback.generator || callback.params.length !== 1 || callback.returnType ||
    callback.typeParameters || callback.params[0].type !== "Identifier" ||
    callback.params[0].typeAnnotation || callback.body.body.length !== 1 ||
    callback.body.body[0].type !== "ReturnStatement") {
    return undefined;
  }
  const returned = callback.body.body[0].argument;
  const isEquality = method.property.name === "filter";
  if (!returned || (isEquality && (returned.type !== "BinaryExpression" ||
    returned.operator !== "===" || !isPrimitiveConstant(returned.right) ||
    returned.right.value === null))) {
    return undefined;
  }
  const member = isEquality ? returned.left : returned;
  if (member.type !== "MemberExpression" || member.computed || member.optional ||
    member.object.type !== "Identifier" ||
    member.object.name !== callback.params[0].name ||
    member.property.type !== "Identifier" || member.property.name === "__proto__") {
    return undefined;
  }
  return { callback, key: member.property.name,
    value: isEquality ? returned.right : undefined,
    helper: isEquality ? "propEq" : "prop" };
}

function _hasLiteralRows(call, key) {
  return call.callee.object.elements.every((element) => {
    const properties = getDataProperties(element);
    return properties && properties.every((property) => {
      return property.key.name !== "__proto__";
    }) && properties.some((property) => { return property.key.name === key; });
  });
}

/** Replaces exact literal-row callbacks with the public property helpers. */
const rule = {
  meta: {
    ...createRuleMetadata("AF-15", "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/property-helper-callbacks.md"),
    type: "suggestion", fixable: "code", schema: [],
    messages: { helper: "AF-15: Use the exact property helper callback." },
  },
  createOnce(context) {
    return { CallExpression(node) {
      const shape = _getCallbackShape(node);
      const sourceCode = context.sourceCode;
      if (!shape || !_hasLiteralRows(node, shape.key) ||
        sourceCode.getCommentsInside(node).length) {
        return;
      }
      const plan = getUtilityImport(sourceCode, node, shape.helper,
        context.filename);
      if (!plan) {
        return;
      }
      if (plan.hasEdits) {
        context.report({ node: plan.declaration, messageId: "helper",
          fix: (fixer) => { return plan.fix(fixer); } });
      }
      const value = shape.value ? `, ${sourceCode.getText(shape.value)}` : "";
      context.report({ node: shape.callback, messageId: "helper", fix(fixer) {
        return fixer.replaceText(shape.callback,
          `${plan.localName}(${JSON.stringify(shape.key)}${value})`);
      } });
    } };
  },
};
export default rule;
