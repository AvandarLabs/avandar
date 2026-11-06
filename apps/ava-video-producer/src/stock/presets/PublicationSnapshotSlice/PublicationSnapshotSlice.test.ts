import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { PublicationSnapshotSlice } from "./PublicationSnapshotSlice";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./PublicationSnapshotSlice.fixtures";
import { inputSchema, type Input } from "./PublicationSnapshotSlice.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(PublicationSnapshotSlice, {
      frame,
      input,
      accent: "#72d5bd",
      id: "packet27",
    }),
  );
function _marker({
  markup,
  key,
  value,
}: {
  markup: string;
  key: string;
  value: string;
}): string {
  const tags = [...markup.matchAll(/<[^>]+>/g)].map((match) => match[0]);
  const tag = tags.find((candidateTag) =>
    candidateTag.includes(`data-${key}="${value}"`),
  );
  assert.ok(tag, `${key} ${value}`);
  return tag;
}

test("selected cells retain pre-edit values and revision while the live source changes", () => {
  const markup = render({ frame: 150 });
  assert.equal((markup.match(/data-snapshot-cell=/g) ?? []).length, 4);
  assert.match(markup, /data-snapshot-cell="a:items" data-value="12"/);
  assert.match(markup, /data-live-cell="a:items" data-value="15"/);
  assert.match(markup, /data-revision="Revision 1"/);
  assert.doesNotMatch(markup, /data-snapshot-cell="[^"]*:note"/);
  const reversed = render({ frame: 150, input: fixtures[3].input });
  assert.match(reversed, /data-snapshot-cell="a:items" data-value="12"/);
  assert.match(reversed, /data-live-cell="a:items" data-value=""/);
  assert.match(reversed, /data-audience="public"/);
});
test("selected value copies cross into a separate snapshot before only the live cell is edited", () => {
  const start = _marker({
      markup: render({ frame: 56 }),
      key: "snapshot-cell",
      value: "a:items",
    }),
    middle = _marker({
      markup: render({ frame: 75 }),
      key: "snapshot-cell",
      value: "a:items",
    }),
    end = _marker({
      markup: render({ frame: 150 }),
      key: "snapshot-cell",
      value: "a:items",
    });
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "y" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: middle, name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "y" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: middle, name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "y" }),
  );
  assert.match(
    render({ frame: 95 }),
    /data-live-cell="a:items" data-value="12"/,
  );
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { publicationSnapshotSliceContract as contract } from "./PublicationSnapshotSlice.contract";

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "rowId",
  "columnId",
  "rowIds",
  "columnIds",
  "audience",
  "cells",
  "value",
];
const getVisibleTexts = ({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] => [
  ...Object.values(input.copy),
  input.publication.label,
  input.publication.revision,
  ...input.table.columns
    .filter(
      ({ id }) =>
        input.showExcludedCells || input.selection.columnIds.includes(id),
    )
    .map(prop("label")),
  ...input.table.rows.flatMap((row) =>
    row.cells.filter(
      (cell, index) =>
        input.showExcludedCells ||
        (input.selection.rowIds.includes(row.id) &&
          input.selection.columnIds.includes(input.table.columns[index].id)),
    ),
  ),
  ...(frame >= 139 ? [input.liveEdit.value] : []),
];
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts,
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract,
  expectedTextPaths: [
    ["table", "columns", 0, "label"],
    ["table", "columns", 1, "label"],
    ["table", "columns", 2, "label"],
    ["table", "rows", 0, "cells", 0],
    ["table", "rows", 0, "cells", 1],
    ["table", "rows", 0, "cells", 2],
    ["table", "rows", 1, "cells", 0],
    ["table", "rows", 1, "cells", 1],
    ["table", "rows", 1, "cells", 2],
    ["liveEdit", "value"],
    ["publication", "revision"],
    ["publication", "label"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("every required top-level field rejects omission", () => {
  Object.keys(DEFAULT_INPUT).forEach((key) => {
    const incomplete = { ...DEFAULT_INPUT };
    Reflect.deleteProperty(incomplete, key);
    assert.equal(inputSchema.safeParse(incomplete).success, false, key);
  });
});

test("one-cell and full-table selections preserve selected order and exact pre-edit values", () => {
  const minimum = render({ frame: 150, input: fixtures[1].input });
  assert.equal((minimum.match(/data-snapshot-cell=/g) ?? []).length, 1);
  assert.match(minimum, /data-snapshot-cell=":" data-value=""/);
  assert.match(minimum, /data-live-cell=":" data-value="new"/);
  const dense = render({ frame: 150, input: fixtures[2].input });
  assert.equal((dense.match(/data-snapshot-cell=/g) ?? []).length, 16);
  const first = _marker({
      markup: dense,
      key: "snapshot-cell",
      value: `${"d".repeat(18)}:${"d".repeat(18)}`,
    }),
    last = _marker({
      markup: dense,
      key: "snapshot-cell",
      value: `${"a".repeat(18)}:${"a".repeat(18)}`,
    });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: first, name: "x" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: last, name: "x" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: first, name: "y" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: last, name: "y" }),
  );
});
test("hidden excluded cells cannot enter the snapshot for either explicit audience", () => {
  ["internal", "public"].forEach((audience) => {
    const input = inputSchema.parse({
        ...DEFAULT_INPUT,
        showExcludedCells: false,
        publication: { ...DEFAULT_INPUT.publication, audience },
      }),
      markup = render({ frame: 150, input: input });
    assert.doesNotMatch(markup, /Internal note|Review|Draft/);
    assert.equal(
      (markup.match(/data-snapshot-cell=/g) ?? []).length,
      input.selection.rowIds.length * input.selection.columnIds.length,
    );
    assert.ok(markup.includes(`data-audience="${audience}"`));
  });
});

import { getSnapshotCellFromFrame } from "./getSnapshotCellFromFrame";

test("the live write cue never changes the frozen snapshot or an unedited source cell", () => {
  [96, 109, 116, 117, 130, 139, 150].forEach((frame) => {
    const snapshot = getSnapshotCellFromFrame({
      input: DEFAULT_INPUT,
      frame,
      rowIndex: 0,
      columnIndex: 1,
      snapshot: true,
    });
    const otherCell = getSnapshotCellFromFrame({
      input: DEFAULT_INPUT,
      frame,
      rowIndex: 1,
      columnIndex: 1,
      snapshot: false,
    });
    assert.equal(snapshot.value, "12");
    assert.equal(snapshot.isEditTarget, false);
    assert.equal(otherCell.value, "8");
    assert.equal(otherCell.isEditTarget, false);
  });
});

function _assertReadablePaint(markup: string): void {
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  SvgPaintAssertions.assertPaintClearance({
    texts: paint.filter(propEq("kind", "text")),
    rectangles: paint.filter(
      (item) =>
        item.kind === "rect" && item.fill !== "none" && item.fillOpacity > 0,
    ),
  });
}

test("reversed full-table snapshot travel preserves visible text and foreground clearance at frame 83", () => {
  _assertReadablePaint(render({ frame: 83, input: fixtures[2].input }));
});

test("PublicationSnapshotSlice transfer sampling preserves visible text and foreground clearance", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    Array.from({ length: 111 }, (_, index) => 56 + index / 2).forEach(
      (frame) => {
        SvgPaintAssertions.assertTextCanvasBounds({
          markup: render({ frame: frame, input: input }),
        });
        _assertReadablePaint(render({ frame: frame, input: input }));
      },
    );
  });
});

test("reversed arbitrary-string copies retain readable destination column attribution from first copy through settling", () => {
  [2, 4].forEach((numColumns) => {
    const columnIds = Array.from(
      { length: numColumns },
      (_, index) => `column${index}`,
    );
    const input = inputSchema.parse({
      ...DEFAULT_INPUT,
      table: {
        columns: columnIds.map((id, index) => ({
          id,
          label: `${"W".repeat(16)}${index}X`,
        })),
        rows: ["first", "second"].map((id, rowIndex) => ({
          id,
          cells: columnIds.map(
            (_, columnIndex) => `v${rowIndex}${columnIndex}`,
          ),
        })),
      },
      selection: {
        rowIds: ["second", "first"],
        columnIds: [...columnIds].reverse(),
      },
      liveEdit: { rowId: "first", columnId: columnIds[0], value: "changed" },
    });
    [83, ...Array.from({ length: 87 }, (_, index) => 56.5 + index / 2)].forEach(
      (frame) => {
        const markup = render({ frame: frame, input: input }),
          paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
        input.selection.columnIds.forEach((columnId, selectedColumn) => {
          const columnIndex = input.table.columns.findIndex(
              propEq("id", columnId),
            ),
            column = input.table.columns[columnIndex];
          const left = 508 + (selectedColumn * 400) / numColumns,
            right = left + 400 / numColumns;
          const labels = paint.filter(
            (item) =>
              item.kind === "text" &&
              item.ariaLabel === column.label &&
              item.left >= left &&
              item.right <= right,
          );
          assert.ok(
            labels.length > 0,
            `Missing visible column attribution for ${columnId} at reversed frame${frame}.`,
          );
          assert.equal(labels.map(prop("text")).join(""), column.label);
          input.table.rows
            .filter((row) => row.id === "first" || frame > 74)
            .forEach((row) => {
              const value = paint.find(
                (item) =>
                  item.kind === "text" &&
                  item.text === row.cells[columnIndex] &&
                  item.left >= left &&
                  item.right <= right,
              );
              assert.ok(
                value,
                `Expected visible arbitrary copy ${row.cells[columnIndex]}.`,
              );
              assert.ok(
                labels.every((label) => label.bottom < value.top),
                "The readable heading must precede its actual values in the same column.",
              );
            });
        });
        SvgPaintAssertions.assertTextCanvasBounds({ markup });
        _assertReadablePaint(markup);
      },
    );
  });
});

test("snapshot transfer heading envelopes clear the retained top border stroke", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    Array.from({ length: 87 }, (_, index) => 56.5 + index / 2).forEach(
      (frame) => {
        const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
          render({ frame: frame, input: input }),
        );
        const outline = paint.find(
          (item) =>
            item.kind === "rect" &&
            item.left === 500 &&
            item.attributes.fill === "none",
        );
        assert.ok(outline);
        const headings = paint.filter(
          (item) =>
            item.kind === "text" &&
            item.left >= 508 &&
            input.table.columns.some(
              propEq<{ label: unknown }, "label", unknown>(
                "label",
                item.ariaLabel,
              ),
            ),
        );
        assert.ok(headings.length > 0);
        const strokeHalfWidth =
          Number(outline.attributes["stroke-width"] ?? 1) / 2;
        headings.forEach((heading) =>
          assert.ok(
            heading.top > outline.top + strokeHalfWidth ||
              heading.bottom < outline.top - strokeHalfWidth,
            `Heading ${heading.text} intersects top stroke at frame ${frame}`,
          ),
        );
      },
    );
  });
});
