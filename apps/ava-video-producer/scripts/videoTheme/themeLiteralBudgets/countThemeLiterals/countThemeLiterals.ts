import ts from "typescript";

/**
 * The theme areas a literal can belong to, after Appendix A of the theme
 * coverage review: colour, the starter palette's `var(--…)` names, type,
 * line and shape, motion, ramps with implicit easing, stroked shapes that
 * bypass the sketch profiles, and stylesheet values.
 */
export type ThemeLiteralArea =
  | "colour"
  | "starter"
  | "type"
  | "line"
  | "motion"
  | "implicitEasing"
  | "sketch"
  | "css";

/** How many theme literals of each area one source file holds. */
export type ThemeLiteralCounts = Readonly<Record<ThemeLiteralArea, number>>;

const EMPTY_COUNTS: ThemeLiteralCounts = {
  colour: 0,
  starter: 0,
  type: 0,
  line: 0,
  motion: 0,
  implicitEasing: 0,
  sketch: 0,
  css: 0,
};

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const COLOR_FUNCTION_PATTERN = /\b(?:rgba?|hsla?|oklch)\(|color-mix\(/g;
const STARTER_PATTERN =
  /var\(--(?:brand|brand-soft|brand-strong|ground|foreground|background|card|muted|muted-foreground|border|shadow|radius)\)/g;
const SHADOW_FUNCTION_PATTERN = /drop-shadow\(/g;
const COLOR_KEYWORD_KEYS = new Set(["fill", "stroke", "color", "background"]);
const SVG_TEXT_TAGS = new Set(["text", "tspan"]);
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
const OPACITY_KEYS = new Set(["opacity", "fillOpacity", "strokeOpacity"]);
const SHADOW_KEYS = new Set(["boxShadow", "textShadow"]);
const MOTION_CONSTANTS = new Set(["EASE", "DUR"]);
const STAGGER_NAMES = new Set(["STAGGER", "STAGGER_COLUMN"]);
const ENTRANCE_HELPERS = new Set(["enter", "enterAt", "leave"]);
const ENTRANCE_KEYS = new Set(["dur", "x", "y"]);

type Counter = (area: ThemeLiteralArea, amount?: number) => void;

function _countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

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

function _isDecimalLiteral(node: ts.Node | undefined): boolean {
  return (
    node !== undefined &&
    _isNumericLiteral(node) &&
    node.getText().includes(".")
  );
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

/** One `key: value` or `key={value}` pair, from an object or a JSX tag. */
function _countKeyedValue(
  key: string,
  value: ts.Expression | undefined,
  count: Counter,
): void {
  const text = _stringText(value);
  if (COLOR_KEYWORD_KEYS.has(key) && (text === "white" || text === "black")) {
    count("colour");
  }
  if (LINE_NUMBER_KEYS.has(key) && _isNumericLiteral(value)) {
    count("line");
  }
  if (OPACITY_KEYS.has(key) && _isDecimalLiteral(value)) {
    count("line");
  }
  if (
    key === "strokeDasharray" &&
    (_isNumericLiteral(value) || /^\d/.test(text ?? ""))
  ) {
    count("line");
  }
  if (SHADOW_KEYS.has(key) && value && !ts.isIdentifier(value)) {
    count("line");
  }
}

function _countTextElement(
  tag: string,
  attributes: readonly ts.JsxAttribute[],
  count: Counter,
): void {
  attributes.forEach((attribute) => {
    const name = _attributeName(attribute);
    const value = _attributeValue(attribute);
    if (tag === "Text" && ["size", "weight", "spacing"].includes(name)) {
      if (_isNumericLiteral(value)) {
        count("type");
      }
    }
    if (SVG_TEXT_TAGS.has(tag)) {
      if (
        ["fontSize", "fontWeight", "letterSpacing"].includes(name) &&
        _isNumericLiteral(value)
      ) {
        count("type");
      }
      if (name === "fontFamily" && _stringText(value) !== undefined) {
        count("type");
      }
    }
  });
}

function _countJsxElement(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  count: Counter,
): void {
  const tag = node.tagName.getText();
  const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
  _countTextElement(tag, attributes, count);
  attributes.forEach((attribute) => {
    _countKeyedValue(
      _attributeName(attribute),
      _attributeValue(attribute),
      count,
    );
  });
  if (STROKED_SHAPE_TAGS.has(tag)) {
    const stroke = attributes.find((attribute) => {
      return _attributeName(attribute) === "stroke";
    });
    if (stroke && _stringText(_attributeValue(stroke)) !== "none") {
      count("sketch");
    }
  }
}

function _countPropertyAssignment(
  node: ts.PropertyAssignment,
  count: Counter,
): void {
  const key = node.name.getText().replace(/^["']|["']$/g, "");
  if (STYLE_NUMBER_KEYS.has(key) && _isNumericLiteral(node.initializer)) {
    count("type");
  }
  if (key === "fontFamily" && _stringText(node.initializer) !== undefined) {
    count("type");
  }
  _countKeyedValue(key, node.initializer, count);
}

function _countEntranceOptions(node: ts.CallExpression, count: Counter): void {
  node.arguments.filter(ts.isObjectLiteralExpression).forEach((options) => {
    options.properties.filter(ts.isPropertyAssignment).forEach((property) => {
      if (
        ENTRANCE_KEYS.has(property.name.getText()) &&
        _isNumericLiteral(property.initializer)
      ) {
        count("motion");
      }
    });
  });
}

function _countCall(node: ts.CallExpression, count: Counter): void {
  const callee = node.expression;
  const name = ts.isIdentifier(callee) ? callee.text : undefined;
  if (name === "ramp") {
    if (node.arguments.length <= 3) {
      count("implicitEasing");
    }
    if (_isNumericLiteral(node.arguments[2])) {
      count("motion");
    }
  }
  if (name === "bezier" && _isNumericLiteral(node.arguments[0])) {
    count("motion");
  }
  if (name === "spring") {
    count("motion");
  }
  if (name !== undefined && ENTRANCE_HELPERS.has(name)) {
    _countEntranceOptions(node, count);
  }
}

function _countIdentifier(node: ts.Identifier, count: Counter): void {
  const parent = node.parent;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) {
    return;
  }
  if (
    MOTION_CONSTANTS.has(node.text) &&
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === node
  ) {
    count("motion");
  }
  if (STAGGER_NAMES.has(node.text)) {
    count("motion");
  }
  if (
    node.text === "STOCK" &&
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === node
  ) {
    count("colour");
  }
}

function _countStringLike(text: string, count: Counter): void {
  count("colour", _countMatches(text, HEX_PATTERN));
  count("colour", _countMatches(text, COLOR_FUNCTION_PATTERN));
  count("starter", _countMatches(text, STARTER_PATTERN));
  count("line", _countMatches(text, SHADOW_FUNCTION_PATTERN));
}

function _visit(node: ts.Node, count: Counter): void {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    _countJsxElement(node, count);
  } else if (ts.isPropertyAssignment(node)) {
    _countPropertyAssignment(node, count);
  } else if (ts.isCallExpression(node)) {
    _countCall(node, count);
  } else if (ts.isIdentifier(node)) {
    _countIdentifier(node, count);
  } else if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  ) {
    if (!ts.isImportDeclaration(node.parent)) {
      _countStringLike(node.text, count);
    }
  }
  ts.forEachChild(node, (child) => {
    return _visit(child, count);
  });
}

/** Removes `/* … *\/` comments, so a commented-out value is not counted. */
function _stripCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function _countCss(source: string): number {
  const declarations = _stripCssComments(source)
    .split(/[;{}]/)
    .map((declaration) => {
      return declaration.trim();
    });
  return declarations.reduce((total, declaration) => {
    const property = declaration.split(":")[0]?.trim() ?? "";
    const value = declaration.slice(property.length + 1);
    const isVariable = value.trim().startsWith("var(");
    const valueCount =
      _countMatches(value, HEX_PATTERN) +
      _countMatches(value, COLOR_FUNCTION_PATTERN) +
      _countMatches(value, STARTER_PATTERN) +
      _countMatches(value, /\b\d+(?:\.\d+)?px\b/g) +
      _countMatches(value, /cubic-bezier\(/g);
    const propertyCount = [
      /^font-(?:size|weight|family)$/.test(property) && !isVariable,
      property === "border-radius",
      /^(?:box|text)-shadow$/.test(property) && !isVariable,
      /^(?:transition|animation)(?:-|$)/.test(property),
    ].filter(Boolean).length;
    return total + valueCount + propertyCount;
  }, 0);
}

/**
 * Counts the theme literals in one renderer source file by area. TS and
 * TSX are parsed, so comments never count and a `fontSize` is judged by
 * the element it sits on; CSS is scanned declaration by declaration. The
 * literal budget test compares the total with the file's slice budget.
 */
export function countThemeLiteralsFromSource(
  fileName: string,
  source: string,
): ThemeLiteralCounts {
  if (fileName.endsWith(".css")) {
    return { ...EMPTY_COUNTS, css: _countCss(source) };
  }
  const counts: Record<ThemeLiteralArea, number> = { ...EMPTY_COUNTS };
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  _visit(sourceFile, (area, amount = 1) => {
    counts[area] += amount;
  });
  return counts;
}

/** The total of every area's count. */
export function sumThemeLiteralCounts(counts: ThemeLiteralCounts): number {
  return Object.values(counts).reduce((total, count) => {
    return total + count;
  }, 0);
}
