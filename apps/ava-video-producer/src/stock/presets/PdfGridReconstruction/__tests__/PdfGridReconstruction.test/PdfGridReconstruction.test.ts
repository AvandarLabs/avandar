import { PdfGridReconstructionTestState } from "./PdfGridReconstructionTestState";

const { render: _render, options } = PdfGridReconstructionTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../../../text/getConservativeWidthFromText";
import { GridLiteralCell } from "../../GridLiteralCell";
import { pdfGridReconstructionContract } from "../../PdfGridReconstruction.contract";
import { DEFAULT_INPUT, fixtures } from "../../PdfGridReconstruction.fixtures";
import { assertCompleteMovingColumnsRemainInput as _assertCompleteMovingColumnsRemainInput } from "./assertCompleteMovingColumnsRemainInput";
import { assertDenseRepeatedEmptyCellsSignal as _assertDenseRepeatedEmptyCellsSignal } from "./assertDenseRepeatedEmptyCellsSignal";

test("each cell occurrence unfolds from its original row and column without value deduplication", () => {
  fixtures.forEach(({ input }) => {
    const hold = _render({ frame: 150, input: input });
    const cells = [...hold.matchAll(/data-result-cell="(\d+):(\d+)"/g)].map(
      ([, row, column]) => {
        return [Number(row), Number(column)];
      },
    );
    assert.deepEqual(
      cells,
      input.grid.rows.flatMap((row, rowIndex) => {
        return row.map((_, columnIndex) => {
          return [rowIndex, columnIndex];
        });
      }),
    );
    assert.equal(
      (hold.match(/data-source-cell=/g) ?? []).length,
      input.grid.rows.length * input.grid.columnLabels.length,
    );
  });
});

test("all evidence modes change geometry while preserving cells and qualify whitespace inference", () => {
  const rendered = ["tagged-cells", "ruling-lines", "whitespace"].map(
    (signal) => {
      return _render({
        frame: 50,
        input: {
          ...fixtures[2].input,
          signal: signal as typeof DEFAULT_INPUT.signal,
        },
      });
    },
  );
  assert.match(rendered[0], /data-tagged-outline=/);
  assert.match(rendered[1], /data-ruling-line=/);
  assert.match(rendered[2], /data-whitespace-corridor=/);
  assert.match(rendered[2], /Inferred layout/);
});

test("actual result cells travel horizontally into an equal sized adjacent grid", () => {
  const cell = (frame: number) => {
    return SvgAttributes.fromMarker({
      markup: _render({ frame: frame }),
      marker: "result-cell",
    });
  };
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

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockDefaultTextAssertions({
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
      ([, line]) => {
        return line;
      },
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
      return _assertDenseRepeatedEmptyCellsSignal(signal);
    },
  );
});

test("complete moving columns remain distinct from all retained source cells and headers", () => {
  [DEFAULT_INPUT, fixtures[2].input].forEach((input) => {
    return _assertCompleteMovingColumnsRemainInput(input);
  });
});
