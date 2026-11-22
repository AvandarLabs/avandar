import { createRuleMetadata } from "@avandar/lint/metadata";
import { getCollapsedJsdoc, getProseLines, getStandaloneLayout } from "./commentSyntax.js";

function _getDeclarationName(node) {
  if (node.type === "FunctionDeclaration") {
    return node.id?.name;
  }
  if (node.type === "VariableDeclaration" && node.kind === "const" &&
    node.declarations.length === 1 && node.declarations[0].id.type === "Identifier") {
    return node.declarations[0].id.name;
  }
  return undefined;
}

function _getDocumentation(sourceCode, declaration) {
  const comments = sourceCode.getCommentsBefore(declaration);
  const comment = comments.at(-1);
  if (comment?.type !== "Block" || !comment.value.startsWith("*") ||
    !getProseLines(comment) || !getStandaloneLayout(sourceCode, comment) ||
    !/^[\t ]*\r?\n[\t ]*$/.test(
      sourceCode.text.slice(comment.range[1], declaration.range[0]),
    )) {
    return undefined;
  }
  return comment;
}

function _getExportedObjects(program) {
  return program.body.flatMap((statement) => {
    const declaration = statement.type === "ExportNamedDeclaration" && statement.declaration;
    if (declaration?.type !== "VariableDeclaration") {
      return [];
    }
    return declaration.declarations.filter((binding) => {
      return binding.id.type === "Identifier" && !binding.id.typeAnnotation &&
        binding.init?.type === "ObjectExpression" &&
        _hasUniqueStaticKeys(binding.init);
    }).map((binding) => { return binding.init; });
  });
}

function _hasUniqueStaticKeys(object) {
  const names = object.properties.map((property) => {
    return property.type === "Property" && !property.computed
      ? String(property.key.name ?? property.key.value) : undefined;
  });
  return !names.includes(undefined) && new Set(names).size === names.length;
}

function _buildDocumentationFromComment(sourceCode, comment, layout) {
  const documentation = getCollapsedJsdoc(comment, layout.indent) ??
    sourceCode.getText(comment);
  const lines = documentation.split(/\r?\n/);
  if (lines.some((line) => {
    return (layout.indent + line).replace(/\t/g, "  ").length > 80;
  })) {
    return undefined;
  }
  return lines.join(layout.newline + layout.indent);
}

function _getMove(sourceCode, declaration, property) {
  const comment = _getDocumentation(sourceCode, declaration);
  const layout = getStandaloneLayout(sourceCode, property, true);
  const variables = sourceCode.getDeclaredVariables(declaration);
  const references = variables.flatMap((variable) => {
    return variable.references;
  })
    .filter((reference) => { return !reference.init; });
  if (!comment || !layout || sourceCode.getCommentsBefore(property).length ||
    references.length !== 1 ||
    references[0].identifier.range[0] !== property.value.range[0]) {
    return undefined;
  }
  if (sourceCode.getAllComments().some((intervening) => {
    return intervening.range[0] >= comment.range[1] &&
      intervening.range[1] <= property.range[0];
  })) {
    return undefined;
  }
  const documentation =
    _buildDocumentationFromComment(sourceCode, comment, layout);
  if (!documentation) {
    return undefined;
  }
  const end = sourceCode.text.indexOf("\n", comment.range[1]);
  return {
    comment, documentation, layout,
    end: end < 0 ? comment.range[1] : end + 1,
  };
}

/** Shares exact relocation ownership so comment rules never overlap fixes. */
export function getExportKeyMoves(program, sourceCode) {
  const declarations = new Map(program.body.map((node) => {
    return [_getDeclarationName(node), node];
  }));
  return _getExportedObjects(program).flatMap((object) => {
    return object.properties.flatMap((property) => {
      if (property.value.type !== "Identifier" || property.kind !== "init") {
        return [];
      }
      const declaration = declarations.get(property.value.name);
      const move = declaration && _getMove(sourceCode, declaration, property);
      return move ? [{ ...move, property }] : [];
    });
  });
}

/** Moves unambiguous local documentation onto the public object's member. */
const rule = {
  meta: {
    ...createRuleMetadata(
      "AF-11",
      "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/docs/rules/module-member-jsdoc.md",
    ),
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: { member: "AF-11: Put existing documentation on the exported module key." },
  },
  createOnce(context) {
    return {
      Program(program) {
        const sourceCode = context.sourceCode;
        getExportKeyMoves(program, sourceCode).forEach((move) => {
            context.report({ node: move.property, messageId: "member", fix(fixer) {
              return [fixer.removeRange([move.comment.range[0], move.end]),
                fixer.insertTextBefore(move.property, move.documentation +
                  move.layout.newline + move.layout.indent)];
            } });
        });
      },
    };
  },
};
export default rule;
