import { prop } from "@avandar/utils";
import ts from "typescript";
/** The literal number an expression is, allowing a leading minus. */
function _isNumericLiteral(node: ts.Node | undefined): boolean {
  if (!node) {
    return false;
  }
  if (ts.isParenthesizedExpression(node)) {
    return _isNumericLiteral(node.expression);
  }
  return (
    ts.isNumericLiteral(node) ||
    (ts.isPrefixUnaryExpression(node) &&
      node.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(node.operand))
  );
}
/**
 * The values an expression can take that a reader sees in source: the
 * expression itself, or both branches of a conditional, so `a ? 0.4 : 1`
 * is judged like `0.4` and `1`.
 */
function _valueBranches(node: ts.Expression | undefined): ts.Expression[] {
  if (!node) {
    return [];
  }
  if (ts.isParenthesizedExpression(node)) {
    return _valueBranches(node.expression);
  }
  return ts.isConditionalExpression(node)
    ? [..._valueBranches(node.whenTrue), ..._valueBranches(node.whenFalse)]
    : [node];
}
/**
 * Whether a duration starts from a literal, such as `18`, `48 - index * 3`,
 * or `isFirst ? 4 : 3`. A duration that starts from a name, such as
 * `duration * 0.4` or `duration - 1`, is a share of a length read elsewhere.
 */
function _leadsWithLiteral(node: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(node)) {
    return _leadsWithLiteral(node.expression);
  }
  if (ts.isConditionalExpression(node)) {
    return (
      _leadsWithLiteral(node.whenTrue) || _leadsWithLiteral(node.whenFalse)
    );
  }
  if (ts.isBinaryExpression(node)) {
    return _leadsWithLiteral(node.left);
  }
  return _isNumericLiteral(node);
}
/** The terms of a sum, such as `reviewAt` and `8` in `reviewAt + 8`. */
function _addedTerms(node: ts.Expression): string[] {
  return ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ? [..._addedTerms(node.left), node.right.getText()]
    : [node.getText()];
}
/** The terms a difference subtracts, such as `88` in `92 - 88`. */
function _subtractedTerms(node: ts.Expression): string[] {
  return ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.MinusToken
    ? [..._subtractedTerms(node.left), node.right.getText()]
    : [];
}
/**
 * Whether a duration is a cue window: the frames from the call's own cue to
 * a later cue, such as `ramp(frame, 88, 92 - 88)`. Cue frames stay as
 * authored at every tempo, so a window between them does too.
 */
function _isCueWindow({
  duration,
  cue,
}: Readonly<{ duration: ts.Expression; cue: ts.Expression }>): boolean {
  const subtracted = _subtractedTerms(duration);
  return (
    subtracted.length > 0 &&
    _addedTerms(cue).every((term) => {
      return subtracted.includes(term);
    })
  );
}
/**
 * Whether an expression multiplies a name by a whole-number literal outside
 * any call, such as `index * 6`: a per-item stagger that ignores the Stagger
 * option unless `motion.scaleStagger` wraps it.
 */
function _holdsLiteralStagger(node: ts.Node): boolean {
  if (ts.isCallExpression(node)) {
    return false;
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.AsteriskToken &&
    (ts.isIdentifier(node.left) || ts.isPropertyAccessExpression(node.left)) &&
    ts.isNumericLiteral(node.right) &&
    !node.right.text.includes(".")
  ) {
    return true;
  }
  return ts.forEachChild(node, _holdsLiteralStagger) ?? false;
}
/** A spacing value with a length in it: a non-zero number or a `px` string. */
function _isSpacingLiteral(node: ts.Expression): boolean {
  const text = _stringText(node);
  if (text !== undefined) {
    return /\b[1-9]\d*(?:\.\d+)?px\b/.test(text);
  }
  if (ts.isTemplateExpression(node)) {
    const parts = [node.head, ...node.templateSpans.map(prop("literal"))];
    return parts.some((part) => {
      return /\b[1-9]\d*(?:\.\d+)?px\b/.test(part.text);
    });
  }
  return _isNumericLiteral(node) && node.getText() !== "0";
}
function _stringText(node: ts.Node | undefined): string | undefined {
  return node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
}
/** The expression a JSX attribute holds: its string, or its `{…}` content. */
function _attributeValue(
  attribute: ts.JsxAttribute,
): ts.Expression | undefined {
  const initializer = attribute.initializer;
  if (!initializer) {
    return undefined;
  }
  return ts.isJsxExpression(initializer) ? initializer.expression : initializer;
}
function _attributeName(attribute: ts.JsxAttribute): string {
  return attribute.name.getText();
}
/** The helper a call names: `ramp` for `ramp(…)` and `motion.ramp(…)`. */
function _calleeName(callee: ts.Expression): string | undefined {
  if (ts.isIdentifier(callee)) {
    return callee.text;
  }
  return ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
}
/** Syntax lookups used to identify literal values in renderers. */
export const LiteralSourceHelpers = {
  /** Whether a syntax node is an explicit numeric literal. */
  isNumericLiteral: _isNumericLiteral,
  /** The alternative values an expression may produce. */
  valueBranches: _valueBranches,
  /** Whether an expression begins with a numeric literal. */
  leadsWithLiteral: _leadsWithLiteral,
  /** Whether a duration and cue declare a fixed animation window. */
  isCueWindow: _isCueWindow,
  /** Whether a stagger expression contains fixed numeric timing. */
  holdsLiteralStagger: _holdsLiteralStagger,
  /** Whether an expression declares fixed spacing. */
  isSpacingLiteral: _isSpacingLiteral,
  /** The raw text held by a string-like syntax node, when present. */
  stringText: _stringText,
  /** The expression supplied by a JSX attribute. */
  attributeValue: _attributeValue,
  /** The unqualified name of a JSX attribute. */
  attributeName: _attributeName,
  /** The helper name selected by a call expression. */
  calleeName: _calleeName,
} as const;
