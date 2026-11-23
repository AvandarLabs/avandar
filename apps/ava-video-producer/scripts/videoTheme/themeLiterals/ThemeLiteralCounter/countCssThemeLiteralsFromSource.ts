import { LiteralPatterns } from "./LiteralPatterns";

function _countPropertyLiterals({
  property,
  value,
  isVariable,
}: Readonly<{ property: string; value: string; isVariable: boolean }>): number {
  return [
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
/** Counts theme literals in CSS declarations. */
export function countCssThemeLiteralsFromSource(source: string): number {
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
      LiteralPatterns.countMatches({
        text: value,
        pattern: LiteralPatterns.HEX_PATTERN,
      }) +
      LiteralPatterns.countMatches({
        text: value,
        pattern: LiteralPatterns.COLOR_FUNCTION_PATTERN,
      }) +
      LiteralPatterns.countMatches({
        text: value,
        pattern: LiteralPatterns.STARTER_PATTERN,
      }) +
      (STRUCTURAL_LAYOUT_PROPERTY.test(property)
        ? 0
        : LiteralPatterns.countMatches({
            text: value,
            pattern: /\b\d+(?:\.\d+)?px\b/g,
          })) +
      LiteralPatterns.countMatches({ text: value, pattern: /cubic-bezier\(/g });
    const propertyCount = _countPropertyLiterals({
      property,
      value,
      isVariable,
    });
    return total + valueCount + propertyCount;
  }, 0);
}
