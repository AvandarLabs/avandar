import { createRuleMetadata } from "@avandar/lint/metadata";
import {
  hasRenameCollision, hasUnsafeFunctionContract,
} from "./functionSafety.js";

function _getComponent(node) {
  const declaration = node.type === "ExportNamedDeclaration"
    ? node.declaration : node;
  return declaration?.type === "FunctionDeclaration" &&
    /^[A-Z]/.test(declaration.id?.name ?? "") && declaration.body &&
    declaration.body.body.some((statement) => {
      return statement.type === "ReturnStatement" &&
        ["JSXElement", "JSXFragment"].includes(statement.argument?.type);
    }) ? declaration : undefined;
}

function _hasRepairBoundary(sourceCode, node, reference) {
  return sourceCode.getTokens(node.typeAnnotation).some((token) => {
    return ["Array", "["].includes(token.value);
  }) || sourceCode.getAllComments().some((comment) => {
    return comment.range[0] >= node.range[0] &&
      comment.range[1] <= reference.identifier.range[1];
  });
}

function _getPropsBinding(sourceCode, node, component) {
  if (node.type !== "TSTypeAliasDeclaration" || node.typeParameters ||
    node.typeAnnotation.type !== "TSTypeLiteral" ||
    !/^[A-Z].*Props$/.test(node.id.name)) {
    return undefined;
  }
  if (!node.parent.body.some((statement) => {
    return statement.range[0] < node.range[0] &&
      ["ImportDeclaration", "ExportNamedDeclaration",
        "ExportDefaultDeclaration", "ExportAllDeclaration"]
        .includes(statement.type);
  })) {
    return undefined;
  }
  const variable = sourceCode.getDeclaredVariables(node).find((candidate) => {
    return candidate.identifiers.includes(node.id);
  });
  if (!variable || variable.defs.length !== 1 ||
    variable.references.length !== 1 || component.params.length !== 1) {
    return undefined;
  }
  const reference = variable.references[0];
  const annotation = component.params[0].typeAnnotation?.typeAnnotation;
  const binding = { variable, references: [reference] };
  return annotation?.type === "TSTypeReference" &&
    annotation.typeName === reference.identifier && !annotation.typeArguments &&
    !_hasRepairBoundary(sourceCode, node, reference) &&
    !hasRenameCollision(sourceCode, binding, "Props") &&
    !hasUnsafeFunctionContract(sourceCode, node, node.id.name)
    ? binding : undefined;
}

function _getJsxOwner(node) {
  if (!node || node.type === "Program" || /Function/.test(node.type)) {
    return node;
  }
  return _getJsxOwner(node.parent);
}

function _reportPropsCandidates(context, program, component) {
  program.body.forEach((node, index) => {
    if (_getComponent(program.body[index + 1] ?? {}) !== component) {
      return;
    }
    const binding = _getPropsBinding(context.sourceCode, node, component);
    if (!binding) {
      return;
    }
    context.report({ node: node.id, messageId: "rename", fix(fixer) {
      return [node.id, binding.references[0].identifier].map(
        (identifier) => { return fixer.replaceText(identifier, "Props"); },
      );
    } });
  });
}

/** Names a sole component's private, unshared object props alias `Props`. */
const rule = {
  meta: {
    ...createRuleMetadata("AF-12", "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/component-props-name.md"),
    type: "suggestion", fixable: "code", schema: [],
    messages: { rename: "AF-12: Name the component's private props alias Props." },
  },
  createOnce(context) {
    let component;
    let hasOtherJsxOwner;
    const visitJsx = (node) => {
      if (component && _getJsxOwner(node) !== component) {
        hasOtherJsxOwner = true;
      }
    };
    return {
      Program(program) {
        component = undefined;
        hasOtherJsxOwner = false;
        if (/\.tsx$/.test(context.filename)) {
          const components = program.body.map(_getComponent).filter(Boolean);
          component = components.length === 1 ? components[0] : undefined;
        }
      },
      JSXElement: visitJsx,
      JSXFragment: visitJsx,
      "Program:exit"(program) {
        if (component && !hasOtherJsxOwner) {
          _reportPropsCandidates(context, program, component);
        }
      },
    };
  },
};
export default rule;
