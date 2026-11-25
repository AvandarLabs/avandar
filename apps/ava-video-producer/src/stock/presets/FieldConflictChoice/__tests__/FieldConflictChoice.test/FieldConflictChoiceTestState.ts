import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { FieldConflictChoice } from "../../FieldConflictChoice";
import { DEFAULT_INPUT } from "../../FieldConflictChoice.fixtures";
import { type Input } from "../../FieldConflictChoice.schema";

type AssertSelectedCaptionRowsOptions = Readonly<{
  markup: string;
  input: Input;
  captions: readonly string[];
}>;

function _assertSelectedCaptionRows({
  markup,
  input,
  captions,
}: AssertSelectedCaptionRowsOptions): void {
  captions.forEach((caption, index) => {
    const panel = _chosenCell({ markup, input, fieldIndex: index });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: caption,
        name: "x",
      }),
      SvgAttributes.getNumberFromMarkup({
        attributes: panel,
        name: "x",
      }) + 12,
    );
    const baseline = SvgAttributes.getNumberFromMarkup({
      attributes: caption,
      name: "y",
    });
    assert.equal(
      baseline,
      SvgAttributes.getNumberFromMarkup({
        attributes: panel,
        name: "y",
      }) + 81,
    );
    assert.ok(baseline + 4 <= 600);
    if (index + 1 < input.fields.length) {
      const heading = _texts({
        markup,
        label: input.fields[index + 1].label,
      })[index + 1];
      assert.ok(
        baseline + 4 <
          SvgAttributes.getNumberFromMarkup({
            attributes: heading,
            name: "y",
          }) -
            14,
      );
    }
  });
}

function _assertAllDenseDataLanesStayXYWidthHeight(
  rects: ReturnType<typeof _cells>,
): void {
  rects.forEach((rect) => {
    const x = SvgAttributes.getNumberFromMarkup({
        attributes: rect,
        name: "x",
      }),
      y = SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "y" });
    assert.ok(
      x >= 0 &&
        x +
          SvgAttributes.getNumberFromMarkup({
            attributes: rect,
            name: "width",
          }) <=
          960,
    );
    assert.ok(
      y >= 0 &&
        y +
          SvgAttributes.getNumberFromMarkup({
            attributes: rect,
            name: "height",
          }) <=
          600,
    );
  });
}

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
    createElement(FieldConflictChoice, {
      frame,
      input,
      accent: "#72d5bd",
      id: "test",
    }),
  );
};

function _cells(markup: string) {
  return [
    ...markup.matchAll(/<rect[^>]*data-candidate-source="[^"]*"[^>]*>/g),
  ].map((match) => {
    return match[0];
  });
}

function _texts({ markup, label }: { markup: string; label: string }) {
  return [...markup.matchAll(/<text\b[^>]*>/g)]
    .map((match) => {
      return match[0];
    })
    .filter((text) => {
      return text.includes(`aria-label="${label}"`);
    });
}

function _chosenCell({
  markup,
  input,
  fieldIndex,
}: {
  markup: string;
  input: Input;
  fieldIndex: number;
}) {
  const field = input.fields[fieldIndex];
  const cell = _cells(markup).find((candidate) => {
    return (
      candidate.includes(`data-field="${field.id}"`) &&
      candidate.includes(`data-candidate-source="${field.chosenSourceId}"`)
    );
  });
  assert.ok(cell);
  return cell;
}

function _assertChoiceMarks({
  markup,
  input,
}: {
  markup: string;
  input: Input;
}) {
  const marks = [...markup.matchAll(/<g data-choice-[^>]*><path[^>]*>/g)];
  assert.equal(marks.length, input.fields.length);
  marks.forEach(([mark], fieldIndex) => {
    const panel = _chosenCell({ markup, input, fieldIndex });
    const path = mark.match(/d="M([\d.-]+) ([\d.-]+)([^"]+)"/);
    assert.ok(path);
    const x = SvgAttributes.getNumberFromMarkup({
      attributes: panel,
      name: "x",
    });
    const top = SvgAttributes.getNumberFromMarkup({
      attributes: panel,
      name: "y",
    });
    const isRail = input.decisionStyle === "sliding-rail";
    assert.equal(Number(path[1]), x + (isRail ? 0 : 2));
    assert.equal(Number(path[2]), top - 5);
    assert.equal(path[3], isRail ? `H${x + 416}` : "h-8v76h8");
  });
}
/** Shared data and assertions for the FieldConflictChoice tests. */
export const FieldConflictChoiceTestState = {
  /**
   * Asserts captions remain below their chosen fields and above the next row.
   */
  assertSelectedCaptionRows: _assertSelectedCaptionRows,
  /** Asserts every candidate rectangle stays inside the stock canvas. */
  assertAllDenseDataLanesStayXYWidthHeight:
    _assertAllDenseDataLanesStayXYWidthHeight,
  /** Renders the selected conflict-choice frame as SVG markup. */
  render,
  /** Returns the candidate source rectangles from rendered SVG markup. */
  cells: _cells,
  /** Returns SVG text elements with the requested accessible label. */
  texts: _texts,
  /** Asserts each choice marker follows the selected candidate geometry. */
  assertChoiceMarks: _assertChoiceMarks,
};
