import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { getSnapshotCellFromFrame } from "../../getSnapshotCellFromFrame";
import { publicationSnapshotSliceContract as contract } from "../../PublicationSnapshotSlice.contract";
import {
  DEFAULT_INPUT,
  fixtures,
} from "../../PublicationSnapshotSlice.fixtures";
import { inputSchema } from "../../PublicationSnapshotSlice.schema";
import { PublicationSnapshotTestHelpers } from "./PublicationSnapshotTestHelpers";

test("selected cells retain pre-edit values and revision while the live source changes", () => {
  const markup = PublicationSnapshotTestHelpers.render({ frame: 150 });
  assert.equal((markup.match(/data-snapshot-cell=/g) ?? []).length, 4);
  assert.match(markup, /data-snapshot-cell="a:items" data-value="12"/);
  assert.match(markup, /data-live-cell="a:items" data-value="15"/);
  assert.match(markup, /data-revision="Revision 1"/);
  assert.doesNotMatch(markup, /data-snapshot-cell="[^"]*:note"/);
  const reversed = PublicationSnapshotTestHelpers.render({
    frame: 150,
    input: fixtures[3].input,
  });
  assert.match(reversed, /data-snapshot-cell="a:items" data-value="12"/);
  assert.match(reversed, /data-live-cell="a:items" data-value=""/);
  assert.match(reversed, /data-audience="public"/);
});
test("selected value copies cross into a separate snapshot before only the live cell is edited", () => {
  const start = PublicationSnapshotTestHelpers.marker({
      markup: PublicationSnapshotTestHelpers.render({ frame: 56 }),
      key: "snapshot-cell",
      value: "a:items",
    }),
    middle = PublicationSnapshotTestHelpers.marker({
      markup: PublicationSnapshotTestHelpers.render({ frame: 75 }),
      key: "snapshot-cell",
      value: "a:items",
    }),
    end = PublicationSnapshotTestHelpers.marker({
      markup: PublicationSnapshotTestHelpers.render({ frame: 150 }),
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
    PublicationSnapshotTestHelpers.render({ frame: 95 }),
    /data-live-cell="a:items" data-value="12"/,
  );
});
registerStockPresetAssertions(PublicationSnapshotTestHelpers.options);
registerStockTextLayoutAssertions(PublicationSnapshotTestHelpers.options);
registerStockDefaultTextAssertions({
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
  const minimum = PublicationSnapshotTestHelpers.render({
    frame: 150,
    input: fixtures[1].input,
  });
  assert.equal((minimum.match(/data-snapshot-cell=/g) ?? []).length, 1);
  assert.match(minimum, /data-snapshot-cell=":" data-value=""/);
  assert.match(minimum, /data-live-cell=":" data-value="new"/);
  const dense = PublicationSnapshotTestHelpers.render({
    frame: 150,
    input: fixtures[2].input,
  });
  assert.equal((dense.match(/data-snapshot-cell=/g) ?? []).length, 16);
  const first = PublicationSnapshotTestHelpers.marker({
      markup: dense,
      key: "snapshot-cell",
      value: `${"d".repeat(18)}:${"d".repeat(18)}`,
    }),
    last = PublicationSnapshotTestHelpers.marker({
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
      markup = PublicationSnapshotTestHelpers.render({ frame: 150, input });
    assert.doesNotMatch(markup, /Internal note|Review|Draft/);
    assert.equal(
      (markup.match(/data-snapshot-cell=/g) ?? []).length,
      input.selection.rowIds.length * input.selection.columnIds.length,
    );
    assert.ok(markup.includes(`data-audience="${audience}"`));
  });
});
test("the live write cue never changes the frozen snapshot or an unedited source cell", () => {
  [96, 109, 116, 117, 130, 139, 150].forEach((frame) => {
    const snapshot = getSnapshotCellFromFrame({
      input: DEFAULT_INPUT,
      frame,
      rowIndex: 0,
      columnIndex: 1,
      snapshot: true,
      motion: PublicationSnapshotTestHelpers.CLASSIC_MOTION,
    });
    const otherCell = getSnapshotCellFromFrame({
      input: DEFAULT_INPUT,
      frame,
      rowIndex: 1,
      columnIndex: 1,
      snapshot: false,
      motion: PublicationSnapshotTestHelpers.CLASSIC_MOTION,
    });
    assert.equal(snapshot.value, "12");
    assert.equal(snapshot.isEditTarget, false);
    assert.equal(otherCell.value, "8");
    assert.equal(otherCell.isEditTarget, false);
  });
});
test("reversed full-table snapshot travel preserves visible text and foreground clearance at frame 83", () => {
  PublicationSnapshotTestHelpers.assertReadablePaint(
    PublicationSnapshotTestHelpers.render({
      frame: 83,
      input: fixtures[2].input,
    }),
  );
});
test("PublicationSnapshotSlice transfer sampling preserves visible text and foreground clearance", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    Array.from({ length: 111 }, (_, index) => {
      return 56 + index / 2;
    }).forEach((frame) => {
      SvgPaintAssertions.assertTextCanvasBounds({
        markup: PublicationSnapshotTestHelpers.render({ frame, input }),
      });
      PublicationSnapshotTestHelpers.assertReadablePaint(
        PublicationSnapshotTestHelpers.render({ frame, input }),
      );
    });
  });
});
test("reversed arbitrary-string copies retain readable destination column attribution from first copy through settling", () => {
  [2, 4].forEach((numColumns) => {
    const columnIds = Array.from({ length: numColumns }, (_, index) => {
      return `column${index}`;
    });
    const input = inputSchema.parse({
      ...DEFAULT_INPUT,
      table: {
        columns: columnIds.map((id, index) => {
          return { id, label: `${"W".repeat(16)}${index}X` };
        }),
        rows: ["first", "second"].map((id, rowIndex) => {
          return {
            id,
            cells: columnIds.map((_, columnIndex) => {
              return `v${rowIndex}${columnIndex}`;
            }),
          };
        }),
      },
      selection: {
        rowIds: ["second", "first"],
        columnIds: [...columnIds].reverse(),
      },
      liveEdit: { rowId: "first", columnId: columnIds[0], value: "changed" },
    });
    [
      83,
      ...Array.from({ length: 87 }, (_, index) => {
        return 56.5 + index / 2;
      }),
    ].forEach((frame) => {
      const markup = PublicationSnapshotTestHelpers.render({ frame, input }),
        paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
      input.selection.columnIds.forEach((columnId, selectedColumn) => {
        const columnIndex = input.table.columns.findIndex(
            propEq("id", columnId),
          ),
          column = input.table.columns[columnIndex];
        const left = 508 + (selectedColumn * 400) / numColumns,
          right = left + 400 / numColumns;
        const labels = paint.filter((item) => {
          return (
            item.kind === "text" &&
            item.ariaLabel === column.label &&
            item.left >= left &&
            item.right <= right
          );
        });
        assert.ok(
          labels.length > 0,
          `Missing visible column attribution for ${columnId} at reversed frame${frame}.`,
        );
        assert.equal(labels.map(prop("text")).join(""), column.label);
        input.table.rows
          .filter((row) => {
            return row.id === "first" || frame > 74;
          })
          .forEach((row) => {
            const value = paint.find((item) => {
              return (
                item.kind === "text" &&
                item.text === row.cells[columnIndex] &&
                item.left >= left &&
                item.right <= right
              );
            });
            assert.ok(
              value,
              `Expected visible arbitrary copy ${row.cells[columnIndex]}.`,
            );
            assert.ok(
              labels.every((label) => {
                return label.bottom < value.top;
              }),
              "The readable heading must precede its actual values in the same column.",
            );
          });
      });
      SvgPaintAssertions.assertTextCanvasBounds({ markup });
      PublicationSnapshotTestHelpers.assertReadablePaint(markup);
    });
  });
});
test("snapshot transfer heading envelopes clear the retained top border stroke", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    Array.from({ length: 87 }, (_, index) => {
      return 56.5 + index / 2;
    }).forEach((frame) => {
      const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
        PublicationSnapshotTestHelpers.render({ frame, input }),
      );
      const outline = paint.find((item) => {
        return (
          item.kind === "rect" &&
          item.left === 500 &&
          item.attributes.fill === "none"
        );
      });
      assert.ok(outline);
      const headings = paint.filter((item) => {
        return (
          item.kind === "text" &&
          item.left >= 508 &&
          input.table.columns.some(
            propEq<{ label: unknown }, "label", unknown>(
              "label",
              item.ariaLabel,
            ),
          )
        );
      });
      assert.ok(headings.length > 0);
      const strokeHalfWidth =
        Number(outline.attributes["stroke-width"] ?? 1) / 2;
      headings.forEach((heading) => {
        return assert.ok(
          heading.top > outline.top + strokeHalfWidth ||
            heading.bottom < outline.top - strokeHalfWidth,
          `Heading ${heading.text} intersects top stroke at frame ${frame}`,
        );
      });
    });
  });
});
