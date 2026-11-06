import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSvgAttributeMatchesFromMarkup } from "../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { LateTypeEvidence } from "../LateTypeEvidence";
import { DEFAULT_INPUT } from "../LateTypeEvidence.fixtures";
import { type Input } from "../LateTypeEvidence.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(LateTypeEvidence, {
        frame,
        input,
        accent: "#3caeff",
        id: "packet30",
      }),
    ),
  );
}

function _values({
  markup,
  attribute,
}: {
  markup: string;
  attribute: string;
}): string[] {
  return getSvgAttributeMatchesFromMarkup({ markup, attribute }).values;
}

function _tags({
  markup,
  attribute,
}: {
  markup: string;
  attribute: string;
}): string[] {
  return getSvgAttributeMatchesFromMarkup({ markup, attribute }).tags;
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...Object.values(input.copy),
    input.labels.column,
    input.labels.rows,
    input.labels.provisional,
    ...(frame >= 101
      ? [
          input.policy === "widen-to-text"
            ? input.labels.text
            : input.labels.review,
        ]
      : []),
  ];
}

const EXCLUSIONS: string[] = [
  "id",
  "fromId",
  "toId",
  "originId",
  "policy",
  "values",
];

/** Inputs for overlaps. */
type OverlapsFirst = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** Inputs for overlaps. */
type OverlapsSecond = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function _overlaps({
  first,
  second,
}: {
  first: Readonly<OverlapsFirst>;
  second: Readonly<OverlapsSecond>;
}): boolean {
  return (
    Math.max(first.left, second.left) < Math.min(first.right, second.right) &&
    Math.max(first.top, second.top) < Math.min(first.bottom, second.bottom)
  );
}

function _getBracketStrokes(markup: string) {
  return _tags({ markup, attribute: "data-review-bracket" }).flatMap((tag) => {
    if (Number(_values({ markup: tag, attribute: "opacity" })[0] ?? 1) === 0) {
      return [];
    }
    const path = _values({ markup: tag, attribute: "d" })[0].match(
      /^M ([^ ]+) ([^ ]+) h ([^ ]+) v ([^ ]+) h ([^ ]+)$/,
    );
    assert.ok(path, "Expected bounded three-segment bracket geometry.");
    const [x, y, width, height, end] = path.slice(1).map(Number),
      half =
        Number(_values({ markup: tag, attribute: "stroke-width" })[0] ?? 1) / 2;
    return [
      {
        left: x - half,
        top: y - half,
        right: x + width + half,
        bottom: y + half,
      },
      {
        left: x + width - half,
        top: y - half,
        right: x + width + half,
        bottom: y + height + half,
      },
      {
        left: Math.min(x + width, x + width + end) - half,
        top: y + height - half,
        right: Math.max(x + width, x + width + end) + half,
        bottom: y + height + half,
      },
    ];
  });
}

function _assertStationaryStrokeShielding({
  markup,
  value,
}: {
  markup: string;
  value: string;
}): void {
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup),
    glyphs = paint.filter(
      (item) => item.kind === "text" && item.ariaLabel === value,
    );
  assert.ok(glyphs.length >= 16);
  paint
    .filter(
      (item) =>
        item.kind === "rect" &&
        item.attributes.stroke !== undefined &&
        item.attributes.stroke !== "none",
    )
    .forEach((rectangle) => {
      const half = Number(rectangle.attributes["stroke-width"] ?? 1) / 2;
      const edges = [
        {
          left: rectangle.left - half,
          top: rectangle.top - half,
          right: rectangle.right + half,
          bottom: rectangle.top + half,
        },
        {
          left: rectangle.left - half,
          top: rectangle.bottom - half,
          right: rectangle.right + half,
          bottom: rectangle.bottom + half,
        },
        {
          left: rectangle.left - half,
          top: rectangle.top - half,
          right: rectangle.left + half,
          bottom: rectangle.bottom + half,
        },
        {
          left: rectangle.right - half,
          top: rectangle.top - half,
          right: rectangle.right + half,
          bottom: rectangle.bottom + half,
        },
      ];
      glyphs.forEach((glyph) =>
        edges
          .filter((edge) => _overlaps({ first: edge, second: glyph }))
          .forEach((edge) => {
            assert.ok(
              paint.some(
                (backing) =>
                  backing.kind === "rect" &&
                  backing.fill !== "none" &&
                  backing.opacity * backing.fillOpacity === 1 &&
                  backing.paintIndex > rectangle.paintIndex &&
                  backing.paintIndex < glyph.paintIndex &&
                  backing.left <= Math.max(edge.left, glyph.left) &&
                  backing.right >= Math.min(edge.right, glyph.right) &&
                  backing.top <= Math.max(edge.top, glyph.top) &&
                  backing.bottom >= Math.min(edge.bottom, glyph.bottom),
              ),
              `Unshielded slot stroke through ${value}`,
            );
          }),
      );
    });
}
export {
  _render,
  _values,
  _tags,
  _getVisibleTexts,
  EXCLUSIONS,
  _overlaps,
  _getBracketStrokes,
  _assertStationaryStrokeShielding,
};
export type { OverlapsFirst, OverlapsSecond };
