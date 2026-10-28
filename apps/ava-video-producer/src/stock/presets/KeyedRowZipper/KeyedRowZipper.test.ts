import assert from "node:assert/strict";
import test from "node:test";
import { propEq, prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { KeyedRowZipper } from "./KeyedRowZipper";
import { keyedRowZipperContract as contract } from "./KeyedRowZipper.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./KeyedRowZipper.fixtures";
import { inputSchema, type Input } from "./KeyedRowZipper.schema";
const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(KeyedRowZipper, {
      frame,
      input,
      accent: "#72d5bd",
      id: "test",
    }),
  );
function _rows({ markup, side }: { markup: string; side: string }) {
  return [
    ...markup.matchAll(new RegExp(`<rect[^>]*data-side="${side}"[^>]*>`, "g")),
  ].map((match) => match[0]);
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["key", "joinType"],
  textFrames: [36, 150],
  getVisibleTexts: ({ input, frame }) => [
    input.labels.title,
    ...(frame < 42
      ? [
          input.labels.left,
          input.labels.right,
          input.labels.key,
          ...input.leftRows.map(prop("value")),
          ...input.rightRows.map(prop("value")),
        ]
      : [
          input.labels.result,
          ...input.leftRows
            .filter(
              (row) =>
                input.joinType === "left" ||
                input.rightRows.some(propEq("key", row.key)),
            )
            .map(prop("value")),
        ]),
  ],
});
test("exact matches zip once while unmatched rows obey inner and left membership", () => {
  const changed = fixtures[3].input;
  const inner = render({ frame: 150, input: changed });
  assert.equal((inner.match(/data-result-key=/g) ?? []).length, 1);
  assert.match(inner, /data-result-key="A B"/);
  assert.match(inner, /data-context-key="A {2}B"/);
  assert.match(inner, /data-context-key="A·B"/);
  const left = render({ frame: 150, input: { ...changed, joinType: "left" } });
  assert.equal((left.match(/data-result-key=/g) ?? []).length, 2);
  assert.match(left, /data-empty-partner="A {2}B"/);
  assert.doesNotMatch(left, /data-context-key="A {2}B"/);
  assert.match(left, /aria-label="A {2}B"/);
  assert.match(left, /text-decoration="underline"/);
});
test("facing table cells close their gap and reorder matching rows at one seam", () => {
  const setupLeft = _rows({ markup: render({ frame: 36 }), side: "left" });
  const setupRight = _rows({ markup: render({ frame: 36 }), side: "right" });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: setupLeft[0], name: "x" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: setupLeft[0],
        name: "width",
      }) <
      SvgAttributes.getNumberFromMarkup({
        attributes: setupRight[0],
        name: "x",
      }),
  );
  const finalLeft = _rows({ markup: render({ frame: 150 }), side: "left" });
  const finalRight = _rows({ markup: render({ frame: 150 }), side: "right" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: finalLeft[0], name: "x" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: finalLeft[0],
        name: "width",
      }),
    SvgAttributes.getNumberFromMarkup({ attributes: finalRight[0], name: "x" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: finalLeft[2], name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: finalRight[1], name: "y" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: setupRight[1], name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: finalRight[1], name: "y" }),
  );
});
test("dense rows stay on canvas across travel and final tray rows remain disjoint", () => {
  [36, 42, 54, 72, 90, 108, 150].forEach((frame) => {
    const markup = render({ frame: frame, input: fixtures[2].input });
    [
      ..._rows({ markup, side: "left" }),
      ..._rows({ markup, side: "right" }),
    ].forEach((row) => {
      const x = SvgAttributes.getNumberFromMarkup({
          attributes: row,
          name: "x",
        }),
        y = SvgAttributes.getNumberFromMarkup({ attributes: row, name: "y" });
      assert.ok(
        x >= 0 &&
          x +
            SvgAttributes.getNumberFromMarkup({
              attributes: row,
              name: "width",
            }) <=
            960,
      );
      assert.ok(
        y >= 0 &&
          y +
            SvgAttributes.getNumberFromMarkup({
              attributes: row,
              name: "height",
            }) <=
            600,
      );
    });
  });
  const markup = render({ frame: 150, input: fixtures[2].input });
  ["left", "right"].forEach((side) => {
    const tray = _rows({ markup, side }).filter((row) =>
      row.includes("data-context-key="),
    );
    tray.slice(1).forEach((row, index) =>
      assert.ok(
        SvgAttributes.getNumberFromMarkup({
          attributes: tray[index],
          name: "y",
        }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: tray[index],
            name: "height",
          }) <=
          SvgAttributes.getNumberFromMarkup({ attributes: row, name: "y" }),
      ),
    );
  });
});
test("hidden context does not change membership and keys remain visible while matching", () => {
  const input = {
    ...fixtures[3].input,
    showKeys: false,
    showUnmatchedTray: false,
  };
  assert.match(render({ frame: 72, input: input }), /aria-label="A {2}B"/);
  const final = render({ frame: 150, input: input });
  assert.equal((final.match(/data-result-key=/g) ?? []).length, 1);
  assert.doesNotMatch(final, /data-context-key=/);
  assert.doesNotMatch(final, /aria-label="A {2}B"/);
});

test("actual facing key cells meet at the seam without normalizing maximum whitespace keys", () => {
  const key = " \t\n\r ".repeat(2);
  const input = {
    ...DEFAULT_INPUT,
    leftRows: [{ key, value: " \t\n\r".repeat(6) }],
    rightRows: [{ key, value: "Other" }],
  };
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = render({ frame: 150, input: input });
  const left = markup.match(/<rect[^>]*data-key-cell="left"[^>]*>/)![0];
  const right = markup.match(/<rect[^>]*data-key-cell="right"[^>]*>/)![0];
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: left, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({ attributes: left, name: "width" }),
    SvgAttributes.getNumberFromMarkup({ attributes: right, name: "x" }),
  );
  assert.ok(markup.includes(`aria-label="${key}"`));
  assert.equal((markup.match(/data-result-key=/g) ?? []).length, 1);
  assert.equal(
    inputSchema.safeParse({ ...input, rightRows: [{ key: " ", value: "" }] })
      .success,
    false,
  );
});
