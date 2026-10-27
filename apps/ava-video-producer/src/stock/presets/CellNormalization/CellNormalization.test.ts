import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { CellNormalization } from "./CellNormalization";
import { cellNormalizationContract as contract } from "./CellNormalization.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./CellNormalization.fixtures";
import { inputSchema, type Input } from "./CellNormalization.schema";
import { CleanupRow } from "./CleanupRow";
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
function _visibleTexts(input: Readonly<Input>): string[] {
  return [
    input.title,
    input.columnLabels.original,
    input.columnLabels.result,
    ...(input.showEditLabels ? [input.columnLabels.change] : []),
    ...input.rows.flatMap((row) => [
      row.before,
      row.after,
      ...(input.showEditLabels ? [row.editLabel] : []),
    ]),
  ];
}
registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "comparison"],
  getVisibleTexts: ({ input }) => _visibleTexts(input),
});
test("only changed cells crossfade into authored replacements while row anchors stay fixed", () => {
  fixtures.forEach(({ input }) => {
    const setup = _render({ frame: 36, input: input }),
      middle = _render({ frame: 76, input: input }),
      hold = _render({ frame: 150, input: input });
    assert.equal(
      (hold.match(/data-edit-bracket=/g) ?? []).length,
      input.rows.filter((row) => row.before !== row.after).length,
    );
    const rowPositions = (markup: string) =>
      [
        ...markup.matchAll(/data-cleanup-row="([^"]*)" transform="([^"]*)"/g),
      ].map((match) => match.slice(1));
    assert.deepEqual(rowPositions(setup), rowPositions(hold));
    assert.equal(rowPositions(hold).length, input.rows.length);
    input.rows.forEach((row) => {
      if (row.before !== row.after) {
        const marker = `data-replacement="${row.id}"`;
        const element = (markup: string) =>
          markup.slice(
            markup.indexOf(marker),
            markup.indexOf(">", markup.indexOf(marker)),
          );
        assert.match(element(setup), /opacity="0"/);
        assert.match(element(hold), /opacity="1"/);
        assert.doesNotMatch(element(middle), /opacity="[01]"/);
      }
    });
    assert.match(
      SvgAttributes.fromMarker({ markup: setup, marker: "original-rail" }),
      /opacity="0"/,
    );
    assert.match(
      SvgAttributes.fromMarker({ markup: hold, marker: "original-rail" }),
      /opacity="1"/,
    );
  });
});
test("data values keep actual spaces, tabs, breaks and empty strings with visual marks on or off", () => {
  const input = fixtures[4].input;
  [true, false].forEach((showWhitespace) =>
    ["side-rail", "inline-ghost"].forEach((comparison) => {
      const held = _render({
        frame: 150,
        input: {
          ...input,
          showWhitespace,
          comparison: comparison as Input["comparison"],
        },
      });
      input.rows.forEach((row) => {
        assert.ok(held.includes(`aria-label="${row.before}"`));
        assert.ok(held.includes(`data-original-value="${row.before}"`));
      });
      assert.equal(held.includes("·"), showWhitespace);
      assert.equal(held.includes("⇥"), showWhitespace);
      assert.equal(held.includes("↵"), showWhitespace);
      assert.match(held, /xml:space="preserve"/);
    }),
  );
  const composite = _render({ frame: 150, input: fixtures[3].input });
  assert.ok(composite.includes("12 (40)"));
  assert.doesNotMatch(composite, /data-edit-bracket="composite"/);
});

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
    (sum, match) => sum + Number(match[1]),
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
  ].find((match) => match[1] === role && match[2] === placement);
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
  const held = _render({ frame: 150, input: input }),
    primary = _labeledText({
      markup: held,
      role: "result",
      placement: "primary",
    });
  assert.equal(primary.copy, input.columnLabels.result);
  assert.equal(primary.opacity, 1);
  assert.equal(
    _labeledText({ markup: held, role: "original", placement: "primary" })
      .opacity,
    0,
  );
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
    const rowRect = markup.match(/<rect[^>]*>/)![0];
    assert.ok(
      literal.bottom <=
        SvgAttributes.getNumberFromMarkup({
          attributes: rowRect,
          name: "height",
        }),
    );
    assert.ok(
      rowY +
        SvgAttributes.getNumberFromMarkup({
          attributes: rowRect,
          name: "height",
        }) <=
        584,
    );
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
test("comparison headings follow actual original, result and edit lanes at setup and hold", () => {
  const dense: Input = {
    ...fixtures[2].input,
    columnLabels: {
      original: "界".repeat(22),
      result: "W".repeat(22),
      change: "M".repeat(22),
    },
    rows: fixtures[2].input.rows.map((row) => ({
      ...row,
      after: "M".repeat(24),
      editLabel: "界".repeat(28),
    })),
  };
  [DEFAULT_INPUT, dense].forEach((source) =>
    ["side-rail", "inline-ghost"].forEach((comparison) =>
      [true, false].forEach((showEditLabels) => {
        const input: Input = {
          ...source,
          comparison: comparison as Input["comparison"],
          showEditLabels,
        };
        const setup = _render({ frame: 36, input: input }),
          before = _labeledText({
            markup: setup,
            role: "original",
            placement: "primary",
          });
        assert.equal(before.copy, input.columnLabels.original);
        assert.equal(before.opacity, 1);
        assert.equal(
          _labeledText({ markup: setup, role: "result", placement: "primary" })
            .opacity,
          0,
        );
        assert.match(
          SvgAttributes.fromMarker({ markup: setup, marker: "cleanup-label" }),
          /opacity="1"/,
        );
        const first = _markedText({
          markup: _renderRow({ input, index: 0, frame: 36 }),
          marker: "before-cell",
        });
        assert.equal(before.x, first.x);
        assert.equal(first.copy, input.rows[0].before);
        const firstRow = _renderRow({ input, index: 0, frame: 36 });
        assert.match(
          SvgAttributes.fromMarker({
            markup: firstRow,
            marker: "original-value",
          }),
          /opacity="0"/,
        );
        if (showEditLabels) {
          assert.match(
            SvgAttributes.fromMarker({
              markup: firstRow,
              marker: "edit-explanation",
            }),
            /opacity="0"/,
          );
        }
        _assertHoldOwnership(input);
      }),
    ),
  );
});
