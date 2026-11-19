import ts from "typescript";

/**
 * The theme areas a literal can belong to, after Appendix A of the theme
 * coverage review: colour, the starter palette's `var(--…)` names, type,
 * line and shape, motion, ramps with implicit easing, stroked shapes that
 * bypass the sketch profiles, inline spacing, and stylesheet values.
 */
export type ThemeLiteralArea =
  | "colour"
  | "starter"
  | "type"
  | "line"
  | "motion"
  | "implicitEasing"
  | "sketch"
  | "spacing"
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
  spacing: 0,
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
/** Colour words that name no colour of their own. */
const NEUTRAL_COLOR_WORDS = new Set([
  "none",
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
]);
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
function _isCueWindow(duration: ts.Expression, cue: ts.Expression): boolean {
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
    const parts = [
      node.head,
      ...node.templateSpans.map((span) => {
        return span.literal;
      }),
    ];
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

/**
 * One `key: value` or `key={value}` pair, from an object or a JSX tag. On a
 * JSX tag any colour word counts; in an object, where a word may name a
 * colour role, only white and black do.
 */
function _countKeyedValue(
  key: string,
  value: ts.Expression | undefined,
  count: Counter,
  isJsxAttribute = false,
): void {
  const text = _stringText(value);
  const isColorWord =
    text !== undefined &&
    (isJsxAttribute
      ? /^[a-z]+$/i.test(text) && !NEUTRAL_COLOR_WORDS.has(text.toLowerCase())
      : text === "white" || text === "black");
  if (COLOR_KEYWORD_KEYS.has(key) && isColorWord) {
    count("colour");
  }
  _valueBranches(value).forEach((branch) => {
    const branchText = _stringText(branch);
    // 0 on a line key means none: no stroke or a square corner.
    if (
      LINE_NUMBER_KEYS.has(key) &&
      branch.getText() !== "0" &&
      (_isNumericLiteral(branch) || /^-?\d/.test(branchText ?? ""))
    ) {
      count("line");
    }
    if (
      OPACITY_KEYS.has(key) &&
      (_isDecimalLiteral(branch) || /^0?\.\d/.test(branchText ?? ""))
    ) {
      count("line");
    }
    if (
      SPACING_KEY.test(key) &&
      branch.getSourceFile().fileName.endsWith(".tsx") &&
      _isSpacingLiteral(branch)
    ) {
      count("spacing");
    }
  });
  if (
    key === "transition" &&
    text !== undefined &&
    INLINE_EFFECT_PATTERN.test(text)
  ) {
    count("motion");
  }
  if (key === "filter" && text !== undefined && /\bblur\(\s*\d/.test(text)) {
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
    if (tag === "Text" && name === "size" && _isNumericLiteral(value)) {
      count("type");
    }
    if (SVG_TEXT_TAGS.has(tag)) {
      if (["fontSize", "fontWeight", "letterSpacing"].includes(name)) {
        count(
          "type",
          _valueBranches(value).filter((branch) => {
            return (
              _isNumericLiteral(branch) || /^\d/.test(_stringText(branch) ?? "")
            );
          }).length,
        );
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
      true,
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
        _isNumericLiteral(property.initializer) &&
        property.initializer.getText() !== "0"
      ) {
        count("motion");
      }
    });
  });
}

/** The helper a call names: `ramp` for `ramp(…)` and `motion.ramp(…)`. */
function _calleeName(callee: ts.Expression): string | undefined {
  if (ts.isIdentifier(callee)) {
    return callee.text;
  }
  return ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
}

function _countCall(node: ts.CallExpression, count: Counter): void {
  const callee = node.expression;
  const name = _calleeName(callee);
  if (
    ts.isIdentifier(callee) &&
    name === "ramp" &&
    node.arguments.length <= 3
  ) {
    count("implicitEasing");
  }
  const durationIndex =
    name === undefined ? undefined : DURATION_ARGUMENT[name];
  const duration =
    durationIndex === undefined ? undefined : node.arguments[durationIndex];
  const cue = node.arguments[1];
  if (
    duration &&
    cue &&
    _leadsWithLiteral(duration) &&
    !_isCueWindow(duration, cue)
  ) {
    count("motion");
  }
  if (
    ts.isPropertyAccessExpression(callee) &&
    name !== undefined &&
    CUE_HELPERS.has(name) &&
    cue &&
    _holdsLiteralStagger(cue)
  ) {
    count("motion");
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

/**
 * Properties that place or size a box on a fixed stage. Their lengths are
 * structural geometry, the CSS counterpart of SVG viewBox coordinates, so
 * they are not theme literals. Spacing (`gap`, `padding`, `margin`) is not in
 * this list: it follows the theme's spacing scale.
 */
const STRUCTURAL_LAYOUT_PROPERTY =
  /^(?:(?:min-|max-)?(?:width|height)|top|right|bottom|left|inset(?:-.+)?|grid-template(?:-.+)?|flex-basis)$/;

/**
 * The one stylesheet that declares the Atlas chrome scale (`--atlas-*` on
 * `:root`). It is the chrome's counterpart of `classic.theme.json`: the source
 * of the values every other chrome stylesheet reads, so it holds them by
 * design.
 */
const CHROME_TOKEN_SHEET = "showcase/chrome-tokens.css";
/** Values that defer to the cascade rather than naming a value. */
const CSS_WIDE_KEYWORD = /^(?:inherit|initial|unset|revert|revert-layer)$/;
/** A duration, a timing function, or a named easing in a transition. */
const TIMING_LITERAL =
  /\b\d*\.?\d+m?s\b|cubic-bezier\(|steps\(|\b(?:ease(?:-in|-out|-in-out)?|linear|step-start|step-end)\b/;

/** A value with every `var(...)` read removed, nested reads included. */
function _removeVariableReads(value: string): string {
  let remaining = value;
  let previous = "";
  while (remaining !== previous) {
    previous = remaining;
    remaining = remaining.replace(/var\([^()]*\)/g, "");
  }
  return remaining;
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
    const isVariable =
      value.trim().startsWith("var(") || CSS_WIDE_KEYWORD.test(value.trim());
    const valueCount =
      _countMatches(value, HEX_PATTERN) +
      _countMatches(value, COLOR_FUNCTION_PATTERN) +
      _countMatches(value, STARTER_PATTERN) +
      (STRUCTURAL_LAYOUT_PROPERTY.test(property)
        ? 0
        : _countMatches(value, /\b\d+(?:\.\d+)?px\b/g)) +
      _countMatches(value, /cubic-bezier\(/g);
    const propertyCount = [
      /^font-(?:size|weight|family)$/.test(property) && !isVariable,
      property === "letter-spacing" &&
        !isVariable &&
        !/^(?:0|normal)$/.test(value.trim()),
      /^(?:color|background(?:-color)?|fill|stroke|border(?:-\w+)?-color)$/.test(
        property,
      ) && /^(?:white|black)$/i.test(value.trim()),
      /^(?:opacity|fill-opacity|stroke-opacity)$/.test(property) &&
        /^0?\.\d+$/.test(value.trim()),
      property === "border-radius" && !isVariable,
      /^(?:box|text)-shadow$/.test(property) && !isVariable,
      /^(?:transition|animation)(?:-|$)/.test(property) &&
        TIMING_LITERAL.test(_removeVariableReads(value)),
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
  if (fileName === CHROME_TOKEN_SHEET) {
    return EMPTY_COUNTS;
  }
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
