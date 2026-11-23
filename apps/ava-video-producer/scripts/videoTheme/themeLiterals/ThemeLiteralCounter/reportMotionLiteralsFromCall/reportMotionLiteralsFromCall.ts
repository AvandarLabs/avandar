import ts from "typescript";
import { LiteralSourceHelpers } from "../LiteralSourceHelpers";
import { type LiteralCountReporter } from "../ThemeLiteralCounter.types";

const ENTRANCE_HELPERS = new Set(["enter", "enterAt", "leave"]);
const ENTRANCE_KEYS = new Set(["dur", "x", "y"]);
/** Duration positions in legacy calls and names in primitive options. */
const DURATION_ARGUMENTS: Readonly<
  Record<string, Readonly<{ position: number; name: string }>>
> = {
  ramp: { position: 2, name: "dur" },
  pop: { position: 2, name: "durationInFrames" },
  count: { position: 3, name: "dur" },
  countTo: { position: 3, name: "dur" },
};
/** Helpers whose start cue may contain a per-item stagger. */
const CUE_HELPERS = new Set([
  "ramp",
  "reveal",
  "enter",
  "enterAt",
  "leave",
  "pop",
  "count",
  "countTo",
  "press",
]);

function _getValueFromOptions({
  options,
  name,
}: Readonly<{
  options: ts.ObjectLiteralExpression;
  name: string;
}>): ts.Expression | undefined {
  const property = options.properties.find(
    (
      candidate,
    ): candidate is ts.PropertyAssignment | ts.ShorthandPropertyAssignment => {
      return (
        (ts.isPropertyAssignment(candidate) ||
          ts.isShorthandPropertyAssignment(candidate)) &&
        candidate.name.getText().replace(/^["']|["']$/g, "") === name
      );
    },
  );
  if (!property) {
    return undefined;
  }
  return ts.isPropertyAssignment(property)
    ? property.initializer
    : property.name;
}

function _getArgumentFromCall({
  node,
  position,
  name,
}: Readonly<{
  node: ts.CallExpression;
  position: number;
  name: string;
}>): ts.Expression | undefined {
  const options = node.arguments[0];
  return options && ts.isObjectLiteralExpression(options)
    ? _getValueFromOptions({ options, name })
    : node.arguments[position];
}

function _countEntranceOptions({
  node,
  name,
  count: onLiteralCount,
}: Readonly<{
  node: ts.CallExpression;
  name: string;
  count: LiteralCountReporter;
}>): void {
  const options = _getArgumentFromCall({
    node,
    position: name === "enterAt" ? 3 : 2,
    name: "opts",
  });
  if (!options || !ts.isObjectLiteralExpression(options)) {
    return;
  }
  options.properties.filter(ts.isPropertyAssignment).forEach((property) => {
    if (
      ENTRANCE_KEYS.has(property.name.getText().replace(/^["']|["']$/g, "")) &&
      LiteralSourceHelpers.isNumericLiteral(property.initializer) &&
      property.initializer.getText() !== "0"
    ) {
      onLiteralCount("motion");
    }
  });
}

function _countDurationAndCue({
  node,
  name,
  count: onLiteralCount,
}: Readonly<{
  node: ts.CallExpression;
  name: string;
  count: LiteralCountReporter;
}>): void {
  const durationParameter = DURATION_ARGUMENTS[name];
  const duration = durationParameter
    ? _getArgumentFromCall({ node, ...durationParameter })
    : undefined;
  const cue = _getArgumentFromCall({ node, position: 1, name: "at" });
  if (
    duration &&
    cue &&
    LiteralSourceHelpers.leadsWithLiteral(duration) &&
    !LiteralSourceHelpers.isCueWindow({ duration, cue })
  ) {
    onLiteralCount("motion");
  }
  const options = node.arguments[0];
  if (
    (ts.isPropertyAccessExpression(node.expression) ||
      (options && ts.isObjectLiteralExpression(options))) &&
    CUE_HELPERS.has(name) &&
    cue &&
    LiteralSourceHelpers.holdsLiteralStagger(cue)
  ) {
    onLiteralCount("motion");
  }
}

/** Reports motion literals in named primitive or positional themed calls. */
export function reportMotionLiteralsFromCall({
  node,
  count: onLiteralCount,
}: Readonly<{
  node: ts.CallExpression;
  count: LiteralCountReporter;
}>): void {
  const callee = node.expression;
  const name = LiteralSourceHelpers.calleeName(callee);
  if (name === undefined) {
    return;
  }
  if (
    (ts.isIdentifier(callee) ||
      (ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === "Motion")) &&
    name === "ramp" &&
    !_getArgumentFromCall({ node, position: 3, name: "easing" })
  ) {
    onLiteralCount("implicitEasing");
  }
  _countDurationAndCue({ node, name, count: onLiteralCount });
  if (
    name === "bezier" &&
    LiteralSourceHelpers.isNumericLiteral(
      _getArgumentFromCall({ node, position: 0, name: "x1" }),
    )
  ) {
    onLiteralCount("motion");
  }
  if (name === "spring") {
    onLiteralCount("motion");
  }
  if (ENTRANCE_HELPERS.has(name)) {
    _countEntranceOptions({ node, name, count: onLiteralCount });
  }
}
