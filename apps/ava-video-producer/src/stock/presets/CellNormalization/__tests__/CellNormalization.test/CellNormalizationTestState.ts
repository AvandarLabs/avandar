import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { CellNormalization } from "../../CellNormalization";
import { DEFAULT_INPUT, fixtures } from "../../CellNormalization.fixtures";
import { type Input } from "../../CellNormalization.schema";
import { CleanupRow } from "../../CleanupRow";
import type { RenderedLabelExpectation } from "../../../../../../tests/helpers/assertRenderedLabelGraphemes/RenderedLabelExpectation.types";

type AssertLiteralRowBoundsOptions = Readonly<{
  markup: string;
  literal: ReturnType<typeof _markedText>;
  rowY: number;
}>;

function _getOriginalHeading(input: Readonly<Input>): {
  setup: string;
  before: ReturnType<typeof _labeledText>;
} {
  const setup = _render({ frame: 36, input: input }),
    before = _labeledText({
      markup: setup,
      role: "original",
      placement: "primary",
    });
  assert.equal(before.copy, input.columnLabels.original);
  assert.equal(before.opacity, 1);
  return { setup, before };
}

function _assertLiteralRowBounds({
  markup,
  literal,
  rowY,
}: AssertLiteralRowBoundsOptions): void {
  const rowRect = markup.match(/<rect[^>]*>/)![0];
  assert.ok(
    literal.bottom <=
      SvgAttributes.getNumberFromMarkup({
        attributes: rowRect,
        name: "height",
      }),
  );
  _assertRenderedGeometryHeight({ rowY, rowRect });
}

function _getPrimaryResultLabel(input: Readonly<Input>): {
  held: string;
  primary: ReturnType<typeof _labeledText>;
} {
  const held = _render({ frame: 150, input: input }),
    primary = _labeledText({
      markup: held,
      role: "result",
      placement: "primary",
    });
  assert.equal(primary.copy, input.columnLabels.result);
  assert.equal(primary.opacity, 1);
  return { held, primary };
}

function _getComparisonHeadingsFollowActualOriginalDenseGeometry(): {
  dense: Input;
} {
  const dense: Input = {
    ...fixtures[2].input,
    columnLabels: {
      original: "界".repeat(22),
      result: "W".repeat(22),
      change: "M".repeat(22),
    },
    rows: fixtures[2].input.rows.map((row) => {
      return {
        ...row,
        after: "M".repeat(24),
        editLabel: "界".repeat(28),
      };
    }),
  };
  return { dense };
}

function _assertRenderedGeometryHeld(held: ReturnType<typeof _render>): void {
  assert.equal(
    _labeledText({ markup: held, role: "original", placement: "primary" })
      .opacity,
    0,
  );
}

function _assertRenderedGeometryHeight({
  rowY,
  rowRect,
}: Readonly<{
  rowY: number;
  rowRect: NonNullable<RegExpMatchArray | null>[number];
}>): void {
  assert.ok(
    rowY +
      SvgAttributes.getNumberFromMarkup({
        attributes: rowRect,
        name: "height",
      }) <=
      584,
  );
}

function _assertComparisonHeadingsFollowActualOriginalEditExplanation({
  showEditLabels,
  firstRow,
}: Readonly<{
  showEditLabels: boolean[][number];
  firstRow: ReturnType<typeof _renderRow>;
}>): void {
  if (showEditLabels) {
    assert.match(
      SvgAttributes.fromMarker({
        markup: firstRow,
        marker: "edit-explanation",
      }),
      /opacity="0"/,
    );
  }
}

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(CellNormalization, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}

function _visibleTexts(input: Readonly<Input>): RenderedLabelExpectation[] {
  return [
    input.title,
    input.columnLabels.original,
    input.columnLabels.result,
    ...(input.showEditLabels ? [input.columnLabels.change] : []),
    ...input.rows.flatMap((row) => {
      return [
        ...[row.before, row.after].map((text): RenderedLabelExpectation => {
          return input.showWhitespace
            ? { text, representation: { kind: "ascii-whitespace" } }
            : text;
        }),
        ...(input.showEditLabels ? [row.editLabel] : []),
      ];
    }),
  ];
}

type TextGeometry = {
  x: number;
  y: number;
  top: number;
  bottom: number;
  copy: string;
};

function _textGeometry(markup: string): TextGeometry {
  const text = markup.match(/<text[^>]*>/)?.[0];
  assert.ok(text);
  const fontSize = SvgAttributes.getNumberFromMarkup({
      attributes: text,
      name: "font-size",
    }),
    y = SvgAttributes.getNumberFromMarkup({ attributes: text, name: "y" });
  const leading = [...markup.matchAll(/<tspan[^>]* dy="([^"]*)"/g)].reduce(
    (sum, match) => {
      return sum + Number(match[1]);
    },
    0,
  );
  return {
    x: SvgAttributes.getNumberFromMarkup({ attributes: text, name: "x" }),
    y,
    top: y - fontSize,
    bottom: y + leading + fontSize * 0.3,
    copy: text.match(/aria-label="([^"]*)"/)?.[1] ?? "",
  };
}

function _labeledText({
  markup,
  role,
  placement,
}: {
  markup: string;
  role: string;
  placement: string;
}): TextGeometry & { opacity: number } {
  const block = [
    ...markup.matchAll(
      /<g data-cleanup-label="([^"]*)" data-label-placement="([^"]*)"[^>]*>([\s\S]*?)<\/g>/g,
    ),
  ].find((match) => {
    return match[1] === role && match[2] === placement;
  });
  assert.ok(block, `${role} heading owns ${placement}`);
  return {
    ..._textGeometry(block[3]),
    opacity: Number(block[0].match(/ opacity="([^"]*)"/)![1]),
  };
}

function _markedText({
  markup,
  marker,
}: {
  markup: string;
  marker: string;
}): TextGeometry {
  const block = markup.match(
    new RegExp(`<g data-${marker}="[^"]*"[^>]*>([\\s\\S]*?)<\\/g>`),
  );
  assert.ok(block, marker);
  return _textGeometry(block[1]);
}

function _renderRow({
  input,
  index,
  frame,
}: {
  input: Input;
  index: number;
  frame: number;
}): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(CleanupRow, {
        input,
        row: input.rows[index],
        index,
        frame,
        accent: "#aabbcc",
      }),
    ),
  );
}

function _assertHoldOwnership(input: Input): void {
  const { held, primary } = _getPrimaryResultLabel(input);
  _assertRenderedGeometryHeld(held);
  input.rows.forEach((row, index) => {
    const markup = _renderRow({ input, index, frame: 150 }),
      literal = _markedText({ markup, marker: "retained-literal" });
    const original = _labeledText({
      markup: input.comparison === "inline-ghost" ? markup : held,
      role: "original",
      placement: "retained",
    });
    assert.equal(original.copy, input.columnLabels.original);
    assert.equal(literal.copy, row.before);
    assert.equal(original.x, literal.x);
    const rowY = Number(
      SvgAttributes.fromMarker({ markup, marker: "cleanup-row" }).match(
        /translate\(0 ([^)]*)\)/,
      )![1],
    );
    assert.ok(
      original.bottom <
        (input.comparison === "inline-ghost" ? 0 : rowY) + literal.top,
    );
    const main = _markedText({
      markup,
      marker: row.before === row.after ? "before-cell" : "replacement",
    });
    assert.equal(main.copy, row.after);
    assert.equal(primary.x, main.x);
    assert.ok(primary.bottom < rowY + main.top);
    if (input.comparison === "inline-ghost") {
      assert.ok(main.bottom < original.top);
    }
    if (input.showEditLabels) {
      _assertEditOwnership({ input, row, rowMarkup: markup, held });
    } else {
      assert.doesNotMatch(`${markup}${held}`, /data-cleanup-label="change"/);
    }
    _assertLiteralRowBounds({ markup, literal, rowY });
  });
}

/** Inputs for assertEditOwnership. */
type AssertEditOwnershipOptions = {
  input: Input;
  row: Input["rows"][number];
  rowMarkup: string;
  held: string;
};

function _assertEditOwnership({
  input,
  row,
  rowMarkup,
  held,
}: AssertEditOwnershipOptions): void {
  const edit = _markedText({ markup: rowMarkup, marker: "edit-value" }),
    inline = input.comparison === "inline-ghost";
  const label = _labeledText({
    markup: inline ? held : rowMarkup,
    role: "change",
    placement: "edit",
  });
  assert.equal(label.copy, input.columnLabels.change);
  assert.equal(edit.copy, row.editLabel);
  assert.match(
    SvgAttributes.fromMarker({ markup: rowMarkup, marker: "edit-explanation" }),
    /opacity="1"/,
  );
  assert.equal(label.x, edit.x);
  const rowY = Number(
    SvgAttributes.fromMarker({
      markup: rowMarkup,
      marker: "cleanup-row",
    }).match(/translate\(0 ([^)]*)\)/)![1],
  );
  assert.ok(label.bottom < (inline ? rowY : 0) + edit.top);
  const rowHeight = SvgAttributes.getNumberFromMarkup({
    attributes: rowMarkup.match(/<rect[^>]*>/)![0],
    name: "height",
  });
  assert.ok(edit.bottom <= rowHeight);
  if (!inline) {
    const main = _markedText({
      markup: rowMarkup,
      marker: row.before === row.after ? "before-cell" : "replacement",
    });
    assert.ok(main.bottom < label.top);
  }
}
/** Shared data and assertions for the CellNormalization tests. */
export const CellNormalizationTestState = {
  /**
   * Returns the initial render and its fully visible original-column heading.
   */
  getOriginalHeading: _getOriginalHeading,
  /** Returns a dense fixture with wide headings, values, and edit labels. */
  getComparisonHeadingsFollowActualOriginalDenseGeometry:
    _getComparisonHeadingsFollowActualOriginalDenseGeometry,
  /** Asserts enabled edit explanations start hidden in the first row. */
  assertComparisonHeadingsFollowActualOriginalEditExplanation:
    _assertComparisonHeadingsFollowActualOriginalEditExplanation,
  /** Renders the selected cell-normalization frame as SVG markup. */
  render: _render,
  /** Returns the authored labels and values expected in the comparison. */
  visibleTexts: _visibleTexts,
  /** Returns text geometry and opacity for the requested heading placement. */
  labeledText: _labeledText,
  /** Returns the geometry of the requested marked SVG text block. */
  markedText: _markedText,
  /** Renders one cleanup row for frame-specific geometry assertions. */
  renderRow: _renderRow,
  /**
   * Asserts held values, headings, and edit labels retain their row ownership.
   */
  assertHoldOwnership: _assertHoldOwnership,
};
