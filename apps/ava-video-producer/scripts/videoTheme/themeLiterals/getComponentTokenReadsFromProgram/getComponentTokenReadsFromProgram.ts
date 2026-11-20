import { isDefined } from "@avandar/utils";
import ts from "typescript";

function _getLiteralFromExpression({
  expression,
  checker,
}: Readonly<{
  expression: ts.Expression | undefined;
  checker: ts.TypeChecker;
}>): string | undefined {
  if (!expression) {
    return undefined;
  }
  if (ts.isStringLiteralLike(expression)) {
    return expression.text;
  }
  const type = checker.getTypeAtLocation(expression);
  return type.isStringLiteral() ? type.value : undefined;
}
function _getKeyFromBinding({
  binding,
  checker,
}: Readonly<{ binding: ts.BindingElement; checker: ts.TypeChecker }>):
  | string
  | undefined {
  const name = binding.propertyName ?? binding.name;
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name)
    ? name.text
    : ts.isComputedPropertyName(name)
      ? _getLiteralFromExpression({ expression: name.expression, checker })
      : undefined;
}
function _getComponentFromType({
  type,
  checker,
}: Readonly<{ type: ts.TypeNode | undefined; checker: ts.TypeChecker }>):
  | string
  | undefined {
  if (!type) {
    return undefined;
  }
  if (ts.isParenthesizedTypeNode(type)) {
    return _getComponentFromType({ type: type.type, checker });
  }
  if (
    ts.isTypeReferenceNode(type) &&
    (type.typeName.getText() === "Readonly" ||
      type.typeName.getText() === "Pick")
  ) {
    return _getComponentFromType({ type: type.typeArguments?.[0], checker });
  }
  if (
    !ts.isIndexedAccessTypeNode(type) ||
    !ts.isTypeReferenceNode(type.objectType) ||
    !ts.isLiteralTypeNode(type.indexType)
  ) {
    return undefined;
  }
  const reference = checker.getSymbolAtLocation(type.objectType.typeName);
  const symbol =
    reference && reference.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(reference)
      : reference;
  return type.objectType.typeName.getText() === "ResolvedVideoComponents" ||
    symbol?.name === "ResolvedVideoComponents"
    ? _getLiteralFromExpression({ expression: type.indexType.literal, checker })
    : undefined;
}
function _getComponentFromHook({
  expression,
  checker,
}: Readonly<{ expression: ts.Expression; checker: ts.TypeChecker }>):
  | string
  | undefined {
  if (
    !ts.isCallExpression(expression) ||
    !ts.isIdentifier(expression.expression)
  ) {
    return undefined;
  }
  const symbol = checker.getSymbolAtLocation(expression.expression);
  const isHook = symbol?.declarations?.some((declaration) => {
    return (
      ts.isImportSpecifier(declaration) &&
      (declaration.propertyName?.text ?? declaration.name.text) ===
        "useVideoProps"
    );
  });
  return isHook
    ? _getLiteralFromExpression({
        expression: expression.arguments[0],
        checker,
      })
    : undefined;
}
function _getComponentFromDeclaration({
  declaration,
  checker,
  visited,
}: Readonly<{
  declaration: ts.Declaration;
  checker: ts.TypeChecker;
  visited: Set<ts.Symbol>;
}>): string | undefined {
  if (ts.isVariableDeclaration(declaration)) {
    return (
      _getComponentFromType({ type: declaration.type, checker }) ??
      (declaration.initializer
        ? _getComponentFromExpression({
            expression: declaration.initializer,
            checker,
            visited,
          })
        : undefined)
    );
  }
  if (
    ts.isParameter(declaration) ||
    ts.isPropertySignature(declaration) ||
    ts.isPropertyDeclaration(declaration)
  ) {
    return _getComponentFromType({ type: declaration.type, checker });
  }
  if (
    ts.isBindingElement(declaration) &&
    ts.isObjectBindingPattern(declaration.parent)
  ) {
    const key = _getKeyFromBinding({ binding: declaration, checker });
    const property = key
      ? checker.getPropertyOfType(
          checker.getTypeAtLocation(declaration.parent),
          key,
        )
      : undefined;
    return _getComponentFromSymbol({ symbol: property, checker, visited });
  }
  return undefined;
}
function _getComponentFromSymbol({
  symbol,
  checker,
  visited,
}: Readonly<{
  symbol: ts.Symbol | undefined;
  checker: ts.TypeChecker;
  visited: Set<ts.Symbol>;
}>): string | undefined {
  if (!symbol || visited.has(symbol)) {
    return undefined;
  }
  visited.add(symbol);
  return symbol.declarations
    ?.map((declaration) => {
      return _getComponentFromDeclaration({ declaration, checker, visited });
    })
    .find(isDefined);
}
function _getComponentFromExpression({
  expression,
  checker,
  visited = new Set(),
}: Readonly<{
  expression: ts.Expression;
  checker: ts.TypeChecker;
  visited?: Set<ts.Symbol>;
}>): string | undefined {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return _getComponentFromExpression({
      expression: expression.expression,
      checker,
      visited,
    });
  }
  const hook = _getComponentFromHook({ expression, checker });
  if (hook) {
    return hook;
  }
  const key = ts.isElementAccessExpression(expression)
    ? _getLiteralFromExpression({
        expression: expression.argumentExpression,
        checker,
      })
    : undefined;
  const symbol = ts.isPropertyAccessExpression(expression)
    ? checker.getSymbolAtLocation(expression.name)
    : ts.isElementAccessExpression(expression) && key
      ? checker.getPropertyOfType(
          checker.getTypeAtLocation(expression.expression),
          key,
        )
      : checker.getSymbolAtLocation(expression);
  return _getComponentFromSymbol({ symbol, checker, visited });
}
function _getMemberReadFromNode({
  node,
  checker,
}: Readonly<{
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression;
  checker: ts.TypeChecker;
}>): string | undefined {
  const parent = node.parent;
  const isWriteOnly =
    (ts.isBinaryExpression(parent) &&
      parent.left === node &&
      parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) ||
    ts.isDeleteExpression(parent);
  const component = _getComponentFromExpression({
    expression: node.expression,
    checker,
  });
  const key = ts.isPropertyAccessExpression(node)
    ? node.name.text
    : _getLiteralFromExpression({
        expression: node.argumentExpression,
        checker,
      });
  return !isWriteOnly && component && key
    ? `components.${component}.${key}`
    : undefined;
}
function _getBindingReadFromNode({
  node,
  checker,
}: Readonly<{ node: ts.BindingElement; checker: ts.TypeChecker }>):
  | string
  | undefined {
  if (node.dotDotDotToken || !ts.isObjectBindingPattern(node.parent)) {
    return undefined;
  }
  const owner = node.parent.parent;
  const parent = ts.isParameter(owner) ? owner.parent : undefined;
  const hasRuntimeBody =
    parent !== undefined &&
    (ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isArrowFunction(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isConstructorDeclaration(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent)) &&
    parent.body !== undefined;
  const component =
    ts.isVariableDeclaration(owner) && owner.initializer
      ? _getComponentFromExpression({ expression: owner.initializer, checker })
      : ts.isParameter(owner) && hasRuntimeBody
        ? _getComponentFromType({ type: owner.type, checker })
        : undefined;
  const key = _getKeyFromBinding({ binding: node, checker });
  return component && key ? `components.${component}.${key}` : undefined;
}
/**
 * Finds component token reads associated with their object symbols. Typed
 * helper inputs preserve ownership when renderers pass props between files.
 * Use this in source audits to distinguish a cursor's scale from an unrelated
 * object with a property of the same name.
 */
export function getComponentTokenReadsFromProgram({
  program,
  sourceFiles,
}: Readonly<{
  program: ts.Program;
  sourceFiles: readonly ts.SourceFile[];
}>): string[] {
  const checker = program.getTypeChecker();
  const reads = new Set<string>();
  const visit = (node: ts.Node): void => {
    const read = ts.isBindingElement(node)
      ? _getBindingReadFromNode({ node, checker })
      : ts.isPropertyAccessExpression(node) ||
          ts.isElementAccessExpression(node)
        ? _getMemberReadFromNode({ node, checker })
        : undefined;
    if (read) {
      reads.add(read);
    }
    ts.forEachChild(node, visit);
  };
  sourceFiles.forEach(visit);
  return [...reads].sort();
}
