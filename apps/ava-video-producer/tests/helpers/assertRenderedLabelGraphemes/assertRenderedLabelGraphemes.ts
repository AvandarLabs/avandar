import assert from "node:assert/strict";
import { matchLiteral, prop } from "@avandar/utils";
import { getSvgAttributeMatchesFromMarkup } from "../getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { SvgFrames } from "../SvgPaintAssertions/SvgFrames";
import { getAccessibleTextFromLabelExpectation } from "./getAccessibleTextFromLabelExpectation";
import { getSvgLabelElementsFromMarkup } from "./getSvgLabelElementsFromMarkup";
import { getSvgTextPaintFromOpeningTags } from "./getSvgTextPaintFromOpeningTags";
import type { RenderedLabelExpectation } from "./RenderedLabelExpectation.types";

type SvgLabelElement = ReturnType<typeof getSvgLabelElementsFromMarkup>[number];

const GRAPHEMES = new Intl.Segmenter("und", { granularity: "grapheme" });

const WHITESPACE_MARKS: Readonly<Record<string, string>> = {
  " ": "·",
  "\t": "⇥",
  "\n": "↵",
  "\r": "␍",
};

function _getGraphemes(text: string): string[] {
  return Array.from(GRAPHEMES.segment(text), prop("segment"));
}

function _getPaintedGraphemes(text: string): string[] {
  return _getGraphemes(text).filter((segment) => {
    return !/^\s+$/u.test(segment);
  });
}

function _hasAttribute({
  element,
  attribute,
  value,
}: Readonly<{
  element: SvgLabelElement;
  attribute: string;
  value: string;
}>): boolean {
  return getSvgAttributeMatchesFromMarkup({
    markup: element.openingTag,
    attribute,
  }).values.includes(value);
}

function _hasSameGraphemes({
  expected,
  painted,
}: Readonly<{
  expected: readonly string[];
  painted: readonly string[];
}>): boolean {
  return (
    painted.length === expected.length &&
    painted.every((grapheme, index) => {
      return grapheme === expected[index];
    })
  );
}

function _matchesText({
  element,
  text,
}: Readonly<{
  element: SvgLabelElement;
  text: string;
}>): boolean {
  const literalValues = getSvgAttributeMatchesFromMarkup({
    markup: element.openingTag,
    attribute: "data-literal-value",
  }).values;
  if (literalValues.length > 0 && !literalValues.includes(text)) {
    return false;
  }
  const isLiteral = literalValues.length > 0;
  const expectedText = isLiteral
    ? text.replace(/\s/gu, (character) => {
        return WHITESPACE_MARKS[character] ?? "␣";
      })
    : text;
  return _hasSameGraphemes({
    expected: _getPaintedGraphemes(expectedText),
    painted: element.body.split(/<[^>]*>/g).flatMap((chunk) => {
      return _getPaintedGraphemes(
        SvgFrames.makeDecodedTextFromSvgEntities(chunk),
      );
    }),
  });
}

/**
 * Checks declared ASCII substitutions while retaining every other character.
 */
function _matchesAsciiWhitespace({
  element,
  text,
}: Readonly<{
  element: SvgLabelElement;
  text: string;
}>): boolean {
  const literalValues = getSvgAttributeMatchesFromMarkup({
    markup: element.openingTag,
    attribute: "data-literal-value",
  }).values;
  const expectedText = text.replace(/[ \t\n\r]/g, (character) => {
    return WHITESPACE_MARKS[character] ?? character;
  });
  return (
    element.tag === "text" &&
    literalValues.every((value) => {
      return value === text;
    }) &&
    _hasSameGraphemes({
      expected: _getGraphemes(expectedText),
      painted: element.body.split(/<[^>]*>/g).flatMap((chunk) => {
        return _getGraphemes(SvgFrames.makeDecodedTextFromSvgEntities(chunk));
      }),
    })
  );
}

/** Literal lines preserve both their exact accessible copy and marker paint. */
function _matchesLiteralLine({
  line,
  value,
}: Readonly<{
  line: SvgLabelElement;
  value: string | undefined;
}>): boolean {
  return (
    value !== undefined &&
    _hasAttribute({ element: line, attribute: "aria-label", value }) &&
    _matchesText({ element: line, text: value })
  );
}

function _matchesLiteralGrid({
  element,
  text,
}: Readonly<{
  element: SvgLabelElement;
  text: string;
}>): boolean {
  const lines = getSvgLabelElementsFromMarkup(element.body).filter((line) => {
    return line.tag === "text";
  });
  const values = lines.map((line) => {
    return getSvgAttributeMatchesFromMarkup({
      markup: line.openingTag,
      attribute: "data-literal-value",
    }).values[0];
  });
  return (
    lines.length > 0 &&
    values.every((value) => {
      return value !== undefined;
    }) &&
    values.join("") === text &&
    _hasSameGraphemes({
      expected: _getGraphemes(text),
      painted: values.flatMap((value) => {
        return _getGraphemes(value ?? "");
      }),
    }) &&
    lines.every((line, index) => {
      return _matchesLiteralLine({ line, value: values[index] });
    })
  );
}

/** Tests an explicitly supplied arrow path and its actual stroke paint. */
function _hasPaintedArrow({
  element,
  path,
}: Readonly<{ element: SvgLabelElement; path: string }>): boolean {
  const paths = getSvgAttributeMatchesFromMarkup({
    markup: element.body,
    attribute: "d",
  });
  return paths.tags.some((tag, index) => {
    if (!tag.startsWith("<path ") || paths.values[index] !== path) {
      return false;
    }
    const attributes = SvgFrames.getSvgAttributes(tag);
    return (
      attributes.stroke !== undefined &&
      attributes.stroke !== "none" &&
      attributes.stroke !== "transparent" &&
      Number(attributes["stroke-width"] ?? 1) > 0 &&
      _isPaintVisible(tag) &&
      _isPaintVisible(element.openingTag)
    );
  });
}

/**
 * Rejects a hidden element or a subtree with an explicitly hidden descendant.
 */
function _isPaintVisible(markup: string): boolean {
  const tags = markup.match(/<[A-Za-z][^>]*>/g) ?? [];
  return tags.every((tag) => {
    const attributes = SvgFrames.getSvgAttributes(tag);
    return (
      attributes.display !== "none" &&
      attributes.visibility !== "hidden" &&
      Number(attributes.opacity ?? 1) > 0 &&
      Number(attributes["stroke-opacity"] ?? 1) > 0 &&
      !/(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:[;\s]|$))/i.test(
        attributes.style ?? "",
      )
    );
  });
}

/** Verifies the arrow's geometry separately from complete numeric/unit text. */
function _matchesDistanceArrow({
  element,
  label,
}: Readonly<{
  element: SvgLabelElement;
  label: Exclude<RenderedLabelExpectation, string>;
}>): boolean {
  const representation = label.representation;
  if (representation.kind !== "distance-arrow") {
    return false;
  }
  return (
    element.tag === "g" &&
    label.text === `↔ ${representation.paintedText}` &&
    _isPaintVisible(element.body) &&
    _hasPaintedArrow({ element, path: representation.path }) &&
    getSvgLabelElementsFromMarkup(element.body).some((child) => {
      return (
        child.tag === "text" &&
        _hasAttribute({
          element: child,
          attribute: "aria-label",
          value: representation.paintedText,
        }) &&
        _matchesText({ element: child, text: representation.paintedText })
      );
    })
  );
}

/** Reads the whole grapheme painted by a visible source text node. */
function _getSourceGlyphPaint(element: Readonly<SvgLabelElement>): {
  graphemes: string[];
  isVisible: boolean;
} {
  const openingTags = [...element.ancestorOpeningTags, element.openingTag];
  const paint = getSvgTextPaintFromOpeningTags(openingTags);
  return {
    graphemes: element.body.split(/<[^>]*>/g).flatMap((chunk) => {
      return _getPaintedGraphemes(
        SvgFrames.makeDecodedTextFromSvgEntities(chunk),
      );
    }),
    isVisible:
      !/<[^>]*>/.test(element.body) &&
      paint.isVisible &&
      !["none", "transparent"].includes(paint.fill.trim().toLowerCase()) &&
      Number.parseFloat(paint.fontSize) > 0 &&
      Number.parseFloat(paint.fillOpacity) > 0,
  };
}

/**
 * Checks explicitly marked source glyphs without accepting arbitrary groups.
 */
function _matchesSourceGlyphRun({
  element,
  text,
}: Readonly<{ element: SvgLabelElement; text: string }>): boolean {
  const glyphs = getSvgLabelElementsFromMarkup(element.body)
    .filter((child) => {
      return child.tag === "text";
    })
    .map((child) => {
      return _getSourceGlyphPaint({
        ...child,
        ancestorOpeningTags: [
          ...element.ancestorOpeningTags,
          element.openingTag,
          ...child.ancestorOpeningTags,
        ],
      });
    });
  return (
    element.tag === "g" &&
    _hasAttribute({
      element,
      attribute: "data-source-glyph-run",
      value: "true",
    }) &&
    glyphs.length > 0 &&
    glyphs.every((glyph) => {
      return glyph.isVisible && glyph.graphemes.length <= 1;
    }) &&
    _hasSameGraphemes({
      expected: _getPaintedGraphemes(text),
      painted: glyphs.flatMap(prop("graphemes")),
    })
  );
}

/** Dispatches declared graphical treatments to their complete paint proof. */
function _matchesDeclaredRepresentation({
  element,
  label,
}: Readonly<{
  element: SvgLabelElement;
  label: Exclude<RenderedLabelExpectation, string>;
}>): boolean {
  return matchLiteral(label.representation.kind, {
    ["ascii-whitespace"]: () => {
      return _matchesAsciiWhitespace({ element, text: label.text });
    },
    ["distance-arrow"]: () => {
      return _matchesDistanceArrow({ element, label });
    },
    ["source-glyph-run"]: () => {
      return _matchesSourceGlyphRun({ element, text: label.text });
    },
  });
}

/**
 * Verifies complete painted graphemes for accessible SVG labels.
 * LiteralDataText and wrapped literal grids use their explicit metadata to
 * preserve visible whitespace marks. Ordinary labels must preserve their
 * authored graphemes.
 */
export function assertRenderedLabelGraphemes({
  markup,
  text,
}: Readonly<{
  markup: string;
  text: RenderedLabelExpectation;
}>): void {
  const accessibleText = getAccessibleTextFromLabelExpectation(text);
  const candidates = getSvgLabelElementsFromMarkup(markup).filter((element) => {
    return (
      _hasAttribute({
        element,
        attribute: "aria-label",
        value: accessibleText,
      }) &&
      (typeof text !== "string" ||
        element.tag === "text" ||
        _hasAttribute({
          element,
          attribute: "data-raw-grid-value",
          value: accessibleText,
        }))
    );
  });
  assert.ok(candidates.length > 0, `Missing rendered label: ${accessibleText}`);
  assert.ok(
    candidates.some((element) => {
      if (typeof text !== "string") {
        return _matchesDeclaredRepresentation({ element, label: text });
      }
      return element.tag === "text"
        ? _matchesText({ element, text })
        : _matchesLiteralGrid({ element, text });
    }),
    `Rendered label lost or split authored graphemes: ${accessibleText}`,
  );
}
