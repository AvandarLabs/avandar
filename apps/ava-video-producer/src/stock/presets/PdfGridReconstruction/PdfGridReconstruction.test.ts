import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { PdfGridReconstruction } from "./PdfGridReconstruction";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./PdfGridReconstruction.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(PdfGridReconstruction, {
      frame,
      input,
      accent: "#9fefca",
      id: "packet26",
    }),
  );
}

test("each cell occurrence unfolds from its original row and column without value deduplication", () => {
  fixtures.forEach(({ input }) => {
    const hold = _render({ frame: 150, input: input });
    const cells = [...hold.matchAll(/data-result-cell="(\d+):(\d+)"/g)].map(
      ([, row, column]) => [Number(row), Number(column)],
    );
    assert.deepEqual(
      cells,
      input.grid.rows.flatMap((row, rowIndex) =>
        row.map((_, columnIndex) => [rowIndex, columnIndex]),
      ),
    );
    assert.equal(
      (hold.match(/data-source-cell=/g) ?? []).length,
      input.grid.rows.length * input.grid.columnLabels.length,
    );
  });
});
test("all evidence modes change geometry while preserving cells and qualify whitespace inference", () => {
  const rendered = ["tagged-cells", "ruling-lines", "whitespace"].map(
    (signal) =>
      _render({
        frame: 50,
        input: {
          ...fixtures[2].input,
          signal: signal as typeof DEFAULT_INPUT.signal,
        },
      }),
  );
  assert.match(rendered[0], /data-tagged-outline=/);
  assert.match(rendered[1], /data-ruling-line=/);
  assert.match(rendered[2], /data-whitespace-corridor=/);
  assert.match(rendered[2], /Inferred layout/);
});
test("actual result cells travel horizontally into an equal sized adjacent grid", () => {
  const cell = (frame: number) =>
    SvgAttributes.fromMarker({
      markup: _render({ frame: frame }),
      marker: "result-cell",
    });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: cell(106), name: "x" }),
    548,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: cell(120), name: "x" }) <
      548 &&
      SvgAttributes.getNumberFromMarkup({ attributes: cell(120), name: "x" }) >
        508,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: cell(139), name: "x" }),
    508,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: cell(139), name: "width" }),
    200,
  );
  const hidden = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showSourceLinks: false },
  });
  assert.match(hidden, /data-source-cell=/);
  assert.match(hidden, /data-result-cell=/);
  assert.doesNotMatch(hidden, /data-source-link=/);
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { GridLiteralCell } from "./GridLiteralCell";
import { pdfGridReconstructionContract } from "./PdfGridReconstruction.contract";
import { inputSchema, type Input } from "./PdfGridReconstruction.schema";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...Object.values(input.copy),
    input.evidenceLabel,
    ...input.grid.columnLabels,
    ...(frame >= 105 ? input.grid.rows.flat() : []),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: pdfGridReconstructionContract,
  render: _render,
  excludedTextFields: ["signal", "rows"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [52, 105, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract: pdfGridReconstructionContract,
  expectedTextPaths: [
    ["grid", "columnLabels", 0],
    ["grid", "columnLabels", 1],
    ["evidenceLabel"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("literal grid lines preserve whitespace and multibase graphemes within each smallest cell", () => {
  [
    "界".repeat(18),
    " ".repeat(18),
    "A\tB\nC\rD",
    "👩‍👩‍👧‍👦WWWWW",
    "é".repeat(9),
    "",
  ].forEach((value) => {
    const markup = renderToStaticMarkup(
      createElement(GridLiteralCell, { value, x: 8, y: 17 }),
    );
    const lines = [...markup.matchAll(/data-literal-value="([^"]*)"/g)].map(
      ([, line]) => line,
    );
    assert.equal(lines.join(""), value);
    assert.ok(lines.length <= 3);
    lines.forEach((line) => {
      const printable = line
        .replace(
          /[\p{Nonspacing_Mark}\p{Enclosing_Mark}\p{Default_Ignorable_Code_Point}\p{Emoji_Modifier}]/gu,
          "",
        )
        .replace(/\s/gu, "␣");
      assert.ok(
        getConservativeWidthFromText({ text: printable, fontSize: 12 }) <= 84,
        line,
      );
    });
  });
});
test("dense repeated and empty cells retain their exact coordinates in all evidence modes", () => {
  (["tagged-cells", "ruling-lines", "whitespace"] as const).forEach(
    (signal) => {
      const input = { ...fixtures[2].input, signal, showSourceLinks: false };
      const hold = _render({ frame: 150, input: input });
      input.grid.rows.forEach((row, rowIndex) =>
        row.forEach((_, columnIndex) => {
          const rect = [...hold.matchAll(/<rect[^>]+>/g)]
            .map(([tag]) => tag)
            .find((tag) =>
              tag.includes(`data-result-cell="${rowIndex}:${columnIndex}"`),
            );
          assert.ok(rect);
          assert.equal(
            SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "x" }),
            508 + columnIndex * 100,
          );
          assert.equal(
            SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "y" }),
            290 + rowIndex * 64,
          );
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: rect,
              name: "width",
            }),
            100,
          );
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: rect,
              name: "height",
            }),
            64,
          );
        }),
      );
      assert.equal(
        (hold.match(/data-raw-grid-value="same"/g) ?? []).length,
        18,
      );
      assert.equal((hold.match(/data-raw-grid-value=""/g) ?? []).length, 2);
    },
  );
});
function _assertGridTextFitsCell({
  markup,
  tag,
}: Readonly<{ markup: string; tag: string }>): void {
  const start = markup.indexOf(tag) + tag.length;
  const end = markup.indexOf("<rect", start);
  const fragment = markup.slice(start, end === -1 ? undefined : end);
  const text = [...fragment.matchAll(/<text[^>]*>[\s\S]*?<\/text>/g)]
    .map(([block]) => block)
    .join("");
  assert.ok(text.length > 0);
  SvgPaintAssertions.assertTextCanvasBounds({
    markup: `<g transform="translate(${-SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "x" })} ${-SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "y" })})">${text}</g>`,
    width: SvgAttributes.getNumberFromMarkup({
      attributes: tag,
      name: "width",
    }),
    height: SvgAttributes.getNumberFromMarkup({
      attributes: tag,
      name: "height",
    }),
  });
}
test("complete moving columns remain distinct from all retained source cells and headers", () => {
  [DEFAULT_INPUT, fixtures[2].input].forEach((input) => {
    [106, 106.5, 108, 110, 118, 122, 130, 138.5, 139, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const rectangles = [...markup.matchAll(/<rect[^>]+>/g)].map(
        ([tag]) => tag,
      );
      const sourcePage = SvgAttributes.fromMarker({
        markup,
        marker: "source-page",
      });
      const sourceRight =
        SvgAttributes.getNumberFromMarkup({
          attributes: sourcePage,
          name: "x",
        }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: sourcePage,
          name: "width",
        });
      const headers = rectangles.filter((tag) => tag.includes('height="80"'));
      const sourceHeaders = headers.slice(0, input.grid.columnLabels.length);
      const resultHeaders = headers.slice(input.grid.columnLabels.length);
      const resultCells = rectangles.filter((tag) =>
        tag.includes("data-result-cell="),
      );
      const sourceCells = rectangles.filter((tag) =>
        tag.includes("data-source-cell="),
      );
      [
        ...sourceHeaders,
        ...sourceCells,
        ...resultHeaders,
        ...resultCells,
      ].forEach((tag) => _assertGridTextFitsCell({ markup, tag }));
      assert.equal(resultHeaders.length, input.grid.columnLabels.length);
      assert.equal(
        resultCells.length,
        input.grid.rows.length * input.grid.columnLabels.length,
      );
      [...resultHeaders, ...resultCells].forEach((tag) => {
        assert.ok(
          SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "x" }) >
            sourceRight + 8,
          `result overprints source at ${frame}: ${tag}`,
        );
        assert.ok(
          tag.includes('fill="none"'),
          "no opaque result hides the retained source",
        );
        assert.ok(
          SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "x" }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: tag,
              name: "width",
            }) +
            0.5 <
            960,
        );
      });
      sourceHeaders.forEach((header, columnIndex) =>
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: header, name: "x" }),
          52 + (columnIndex * 400) / input.grid.columnLabels.length,
        ),
      );
      resultHeaders.forEach((header, columnIndex) => {
        if (columnIndex > 0) {
          assert.ok(
            SvgAttributes.getNumberFromMarkup({
              attributes: resultHeaders[columnIndex - 1],
              name: "x",
            }) +
              SvgAttributes.getNumberFromMarkup({
                attributes: resultHeaders[columnIndex - 1],
                name: "width",
              }) <=
              SvgAttributes.getNumberFromMarkup({
                attributes: header,
                name: "x",
              }),
            "whole columns remain disjoint during their stagger",
          );
        }
        const cells = resultCells.filter((tag) =>
          tag.includes(`:${columnIndex}"`),
        );
        cells.forEach((cell) =>
          assert.equal(
            SvgAttributes.getNumberFromMarkup({ attributes: cell, name: "x" }),
            SvgAttributes.getNumberFromMarkup({
              attributes: header,
              name: "x",
            }),
          ),
        );
      });
      assert.ok(
        markup.indexOf("data-source-page=") <
          markup.indexOf("data-source-cell="),
      );
      assert.ok(
        markup.indexOf("data-source-cell=") <
          markup.indexOf("data-result-cell="),
      );
    });
  });
});

import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
