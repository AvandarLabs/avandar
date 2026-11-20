import ts from "typescript";
import { LiteralPatterns } from "./LiteralPatterns";
import { LiteralSourceHelpers } from "./LiteralSourceHelpers";
import { reportTextLiteralsFromElement } from "./reportTextLiteralsFromElement";
import {
  type LiteralCountReporter,
  type CountKeyedValueOptions,
} from "./ThemeLiteralCounter.types";

const COLOR_KEYWORD_KEYS = new Set(["fill", "stroke", "color", "background"]);
const STROKED_SHAPE_TAGS = new Set([
  "rect",
  "circle",
  "path",
  "line",
  "ellipse",
  "polygon",
  "polyline",
]);
const STYLE_NUMBER_KEYS = new Set([
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
]);
const LINE_NUMBER_KEYS = new Set(["strokeWidth", "rx", "ry", "borderRadius"]);
const OPACITY_KEYS = new Set([
  "opacity",
  "fillOpacity",
  "strokeOpacity",
  "stopOpacity",
  "floodOpacity",
]);
/** Inline spacing, which follows the theme's spacing scale. */
const SPACING_KEY =
  /^(?:padding|margin)(?:Top|Right|Bottom|Left|Inline|Block)?$|^(?:gap|rowGap|columnGap)$/;
const SHADOW_KEYS = new Set(["boxShadow", "textShadow"]);
const MOTION_CONSTANTS = new Set(["EASE", "DUR"]);
const STAGGER_NAMES = new Set(["STAGGER", "STAGGER_COLUMN"]);
const ENTRANCE_HELPERS = new Set(["enter", "enterAt", "leave"]);
const ENTRANCE_KEYS = new Set(["dur", "x", "y"]);
/**
 * Themed motion helpers by the index of the argument that holds their
 * duration. A literal there ignores tempo unless `scale` wraps it.
 */
const DURATION_ARGUMENT: Readonly<Record<string, number>> = {
  ramp: 2,
  pop: 2,
  count: 3,
};
/** Themed motion helpers whose second argument is the frame they start on. */
const CUE_HELPERS = new Set([
  "ramp",
  "reveal",
  "enter",
  "enterAt",
  "leave",
  "pop",
  "count",
  "press",
]);
/** A duration or blur radius written into an inline style string. */
const INLINE_EFFECT_PATTERN = /\bblur\(\s*\d|\b\d*\.?\d+m?s\b/;
/** One branch of a keyed value: a line, opacity, or spacing literal. */
function _countKeyedBranch({
  key,
  branch,
  count: onLiteralCount,
}: Readonly<{
  key: string;
  branch: ts.Expression;
  count: LiteralCountReporter;
}>): void {
  const branchText = LiteralSourceHelpers.stringText(branch);
  // 0 on a line key means none: no stroke or a square corner.
  if (
    LINE_NUMBER_KEYS.has(key) &&
    branch.getText() !== "0" &&
    (LiteralSourceHelpers.isNumericLiteral(branch) ||
      /^-?\d/.test(branchText ?? ""))
  ) {
    onLiteralCount("line");
  }
  if (
    OPACITY_KEYS.has(key) &&
    ((branch !== undefined &&
      LiteralSourceHelpers.isNumericLiteral(branch) &&
      branch.getText().includes(".")) ||
      /^0?\.\d/.test(branchText ?? ""))
  ) {
    onLiteralCount("line");
  }
  if (
    SPACING_KEY.test(key) &&
    branch.getSourceFile().fileName.endsWith(".tsx") &&
    LiteralSourceHelpers.isSpacingLiteral(branch)
  ) {
    onLiteralCount("spacing");
  }
}
/** A keyed transition, blur, dash, or shadow literal. */
function _countKeyedEffect({
  key,
  value,
  count: onLiteralCount,
}: Readonly<{
  key: string;
  value: ts.Expression | undefined;
  count: LiteralCountReporter;
}>): void {
  const text = LiteralSourceHelpers.stringText(value);
  if (
    key === "transition" &&
    text !== undefined &&
    INLINE_EFFECT_PATTERN.test(text)
  ) {
    onLiteralCount("motion");
  }
  if (key === "filter" && text !== undefined && /\bblur\(\s*\d/.test(text)) {
    onLiteralCount("line");
  }
  if (
    key === "strokeDasharray" &&
    (LiteralSourceHelpers.isNumericLiteral(value) || /^\d/.test(text ?? ""))
  ) {
    onLiteralCount("line");
  }
  if (SHADOW_KEYS.has(key) && value && !ts.isIdentifier(value)) {
    onLiteralCount("line");
  }
}
/**
 * One `key: value` or `key={value}` pair, from an object or a JSX tag. On a
 * JSX tag any colour word counts; in an object, where a word may name a
 * colour role, only white and black do.
 */
function _countKeyedValue({
  key,
  value,
  count: onLiteralCount,
  isJsxAttribute = false,
}: Readonly<CountKeyedValueOptions>): void {
  const text = LiteralSourceHelpers.stringText(value);
  const isColorWord =
    text !== undefined &&
    (isJsxAttribute
      ? /^[a-z]+$/i.test(text) &&
        !LiteralPatterns.NEUTRAL_COLOR_WORDS.has(text.toLowerCase())
      : text === "white" || text === "black");
  if (COLOR_KEYWORD_KEYS.has(key) && isColorWord) {
    onLiteralCount("colour");
  }
  LiteralSourceHelpers.valueBranches(value).forEach((branch) => {
    _countKeyedBranch({ key, branch, count: onLiteralCount });
  });
  _countKeyedEffect({ key, value, count: onLiteralCount });
}
function _countJsxElement({
  node,
  count: onLiteralCount,
}: Readonly<{
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement;
  count: LiteralCountReporter;
}>): void {
  const tag = node.tagName.getText();
  const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
  reportTextLiteralsFromElement({ tag, attributes, count: onLiteralCount });
  attributes.forEach((attribute) => {
    _countKeyedValue({
      key: LiteralSourceHelpers.attributeName(attribute),
      value: LiteralSourceHelpers.attributeValue(attribute),
      count: onLiteralCount,
      isJsxAttribute: true,
    });
  });
  if (STROKED_SHAPE_TAGS.has(tag)) {
    const stroke = attributes.find((attribute) => {
      return LiteralSourceHelpers.attributeName(attribute) === "stroke";
    });
    if (
      stroke &&
      LiteralSourceHelpers.stringText(
        LiteralSourceHelpers.attributeValue(stroke),
      ) !== "none"
    ) {
      onLiteralCount("sketch");
    }
  }
}
function _countPropertyAssignment({
  node,
  count: onLiteralCount,
}: Readonly<{
  node: ts.PropertyAssignment;
  count: LiteralCountReporter;
}>): void {
  const key = node.name.getText().replace(/^["']|["']$/g, "");
  if (
    STYLE_NUMBER_KEYS.has(key) &&
    LiteralSourceHelpers.isNumericLiteral(node.initializer)
  ) {
    onLiteralCount("type");
  }
  if (
    key === "fontFamily" &&
    LiteralSourceHelpers.stringText(node.initializer) !== undefined
  ) {
    onLiteralCount("type");
  }
  _countKeyedValue({ key, value: node.initializer, count: onLiteralCount });
}
function _countEntranceOptions({
  node,
  count: onLiteralCount,
}: Readonly<{
  node: ts.CallExpression;
  count: LiteralCountReporter;
}>): void {
  node.arguments.filter(ts.isObjectLiteralExpression).forEach((options) => {
    options.properties.filter(ts.isPropertyAssignment).forEach((property) => {
      if (
        ENTRANCE_KEYS.has(property.name.getText()) &&
        LiteralSourceHelpers.isNumericLiteral(property.initializer) &&
        property.initializer.getText() !== "0"
      ) {
        onLiteralCount("motion");
      }
    });
  });
}
function _countCall({
  node,
  count: onLiteralCount,
}: Readonly<{
  node: ts.CallExpression;
  count: LiteralCountReporter;
}>): void {
  const callee = node.expression;
  const name = LiteralSourceHelpers.calleeName(callee);
  if (
    ts.isIdentifier(callee) &&
    name === "ramp" &&
    node.arguments.length <= 3
  ) {
    onLiteralCount("implicitEasing");
  }
  const durationIndex =
    name === undefined ? undefined : DURATION_ARGUMENT[name];
  const duration =
    durationIndex === undefined ? undefined : node.arguments[durationIndex];
  const cue = node.arguments[1];
  if (
    duration &&
    cue &&
    LiteralSourceHelpers.leadsWithLiteral(duration) &&
    !LiteralSourceHelpers.isCueWindow({ duration, cue })
  ) {
    onLiteralCount("motion");
  }
  if (
    ts.isPropertyAccessExpression(callee) &&
    name !== undefined &&
    CUE_HELPERS.has(name) &&
    cue &&
    LiteralSourceHelpers.holdsLiteralStagger(cue)
  ) {
    onLiteralCount("motion");
  }
  if (
    name === "bezier" &&
    LiteralSourceHelpers.isNumericLiteral(node.arguments[0])
  ) {
    onLiteralCount("motion");
  }
  if (name === "spring") {
    onLiteralCount("motion");
  }
  if (name !== undefined && ENTRANCE_HELPERS.has(name)) {
    _countEntranceOptions({ node, count: onLiteralCount });
  }
}
function _countIdentifier({
  node,
  count: onLiteralCount,
}: Readonly<{
  node: ts.Identifier;
  count: LiteralCountReporter;
}>): void {
  const parent = node.parent;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) {
    return;
  }
  if (
    MOTION_CONSTANTS.has(node.text) &&
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === node
  ) {
    onLiteralCount("motion");
  }
  if (STAGGER_NAMES.has(node.text)) {
    onLiteralCount("motion");
  }
  if (
    node.text === "STOCK" &&
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === node
  ) {
    onLiteralCount("colour");
  }
}
function _countStringLike({
  text,
  count: onLiteralCount,
}: Readonly<{
  text: string;
  count: LiteralCountReporter;
}>): void {
  onLiteralCount(
    "colour",
    LiteralPatterns.countMatches({
      text,
      pattern: LiteralPatterns.HEX_PATTERN,
    }),
  );
  onLiteralCount(
    "colour",
    LiteralPatterns.countMatches({
      text,
      pattern: LiteralPatterns.COLOR_FUNCTION_PATTERN,
    }),
  );
  onLiteralCount(
    "starter",
    LiteralPatterns.countMatches({
      text,
      pattern: LiteralPatterns.STARTER_PATTERN,
    }),
  );
  onLiteralCount(
    "line",
    LiteralPatterns.countMatches({
      text,
      pattern: LiteralPatterns.SHADOW_FUNCTION_PATTERN,
    }),
  );
}
/** Reports theme literals found while traversing a source syntax tree. */
export function reportScriptLiteralsFromNode({
  node,
  count: onLiteralCount,
}: Readonly<{
  node: ts.Node;
  count: LiteralCountReporter;
}>): void {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    _countJsxElement({ node, count: onLiteralCount });
  } else if (ts.isPropertyAssignment(node)) {
    _countPropertyAssignment({ node, count: onLiteralCount });
  } else if (ts.isCallExpression(node)) {
    _countCall({ node, count: onLiteralCount });
  } else if (ts.isIdentifier(node)) {
    _countIdentifier({ node, count: onLiteralCount });
  } else if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  ) {
    if (!ts.isImportDeclaration(node.parent)) {
      _countStringLike({ text: node.text, count: onLiteralCount });
    }
  }
  ts.forEachChild(node, (child) => {
    return reportScriptLiteralsFromNode({ node: child, count: onLiteralCount });
  });
}
