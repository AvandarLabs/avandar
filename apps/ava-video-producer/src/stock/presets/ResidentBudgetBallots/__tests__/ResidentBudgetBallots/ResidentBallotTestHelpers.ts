/** Behavioral scene, input, identity and geometry assertions. */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResidentBudgetBallots } from "../../ResidentBudgetBallots";
import { DEFAULT_INPUT } from "../../ResidentBudgetBallots.fixtures";
import { type Input } from "../../ResidentBudgetBallots.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(ResidentBudgetBallots, {
        frame,
        input,
        accent: "#67e8c2",
        id: "test",
      }),
    ),
  );
}
/**
 * Rendered markup with each marked sketch-aware shape read as one element.
 * `SketchedShape` draws its plain shape inside a group that carries the
 * shape's markers (`data-*`, `aria-label`, `transform`), so the group's
 * attributes move onto the shape these assertions read.
 */
function _joinMarkedShapes(markup: string): string {
  return markup.replace(
    /<g((?:\s+(?:data-[\w-]+|aria-label|transform)="[^"]*")+)><(path|line|circle|rect|ellipse)\b([^>]*)><\/\2><\/g>/g,
    "<$2$1$3></$2>",
  );
}
function _marker({
  markup,
  marker,
  id,
}: {
  markup: string;
  marker: string;
  id: string;
}): string {
  const attributes = markup.match(
    new RegExp(`<[^>]*data-${marker}="${id}"[^>]*>`),
  )?.[0];
  assert.ok(attributes, `${marker} for ${id} must be emitted`);
  return attributes;
}
/**
 * Renders ballot scenes and reads stable SVG markers for behavioral assertions.
 */
export const ResidentBallotTestHelpers = {
  /** Returns ballot SVG with sketch-group markers joined onto their shapes. */
  render: _render,
  /** Returns the SVG tag matching a ballot data marker, or fails the test. */
  marker: _marker,
} as const;
