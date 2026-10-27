import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { PortableWorkTransfer } from "./PortableWorkTransfer";
import { portableWorkTransferContract } from "./PortableWorkTransfer.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "./PortableWorkTransfer.fixtures";
import { inputSchema, type Input } from "./PortableWorkTransfer.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(PortableWorkTransfer, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}
const render: ({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>) => string = _render;
test("all authored fixtures are accepted and every rejection fixture fails", () => {
  FIXTURES.forEach(({ input }) =>
    assert.deepEqual(inputSchema.parse(input), input),
  );
  invalidInputs.forEach((input) =>
    assert.equal(
      inputSchema.safeParse(input).success,
      false,
      JSON.stringify(input),
    ),
  );
});
test("each artifact retains its original and one same-ID copy without pending success", () => {
  ["accepted", "awaiting-open"].forEach((transferState) => {
    const input = inputSchema.parse({
      ...FIXTURES[2].input,
      transferState,
      showIdentityTabs: false,
    });
    const hold = render({ frame: 150, input: input });
    input.artifacts.forEach(({ id }) => {
      assert.equal(
        (hold.match(new RegExp(`data-original="${id}"`, "g")) || []).length,
        1,
      );
      assert.equal(
        (hold.match(new RegExp(`data-transfer-copy="${id}"`, "g")) || [])
          .length,
        1,
      );
    });
    assert.equal(
      hold.includes('data-destination-use="true"'),
      transferState === "accepted",
    );
    assert.equal(
      hold.includes('data-folio-closed="true"'),
      transferState === "awaiting-open",
    );
  });
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.ownerLabel,
    ...Object.values(input.tools),
    ...input.artifacts.map(prop("label")),
    input.labels.originals,
    input.labels.example,
    frame < 93
      ? input.labels.copies
      : frame >= 130
        ? input.transferState === "accepted"
          ? input.labels.received
          : input.labels.pending
        : input.labels.portable,
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "pattern",
  "kind",
  "workpieceMaterial",
  "transferState",
  "enclosure",
  "targetModuleId",
  "source",
  "destination",
  "category",
  "measure",
  "question",
  "selectedCategory",
  "columnIds",
  "cachedColumnIds",
  "keyColumnId",
  "cells",
];
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs,
  contract: portableWorkTransferContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract: options.contract,
  suppliedInputs: FIXTURES.map(prop("input")),
  expectedTextPaths: [
    ["ownerLabel"],
    ["tools", "source"],
    ["tools", "destination"],
    ["artifacts", 0, "label"],
    ["artifacts", 1, "label"],
    ["labels", "originals"],
    ["labels", "copies"],
    ["labels", "portable"],
    ["labels", "received"],
    ["labels", "pending"],
    ["labels", "example"],
  ],
});

test("the complete loaded folio moves rigidly with the owner's contacting hand", () => {
  const input = FIXTURES[2].input;
  const frames = [94, 100, 108, 114];
  const positions = frames.map((frame) => {
    const markup = render({ frame: frame, input: input }),
      folio = SvgAttributes.fromMarker({ markup, marker: "folio" }),
      hand = SvgAttributes.fromMarker({ markup, marker: "owner-hand" });
    const x = SvgAttributes.getNumberFromMarkup({
      attributes: folio,
      name: "x",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      x + 125,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: folio, name: "y" }) - 3,
    );
    input.artifacts.forEach(({ id }, index) => {
      const copy = markup.match(
        new RegExp(`<g data-transfer-copy="${id}">([\\s\\S]*?)<\\/g>`),
      )?.[1];
      assert.ok(copy);
      const body = SvgAttributes.fromMarker({
        markup: copy,
        marker: "artifact-body",
      });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: body, name: "x" }),
        x + 12,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" }),
        210 + index * 86,
      );
    });
    assert.ok(
      markup.indexOf("data-transfer-copy=") <
        markup.indexOf("data-folio-cover="),
    );
    return x;
  });
  assert.ok(
    positions.every((x, index) => index === 0 || x > positions[index - 1]),
  );
});
test("pending copy labels remain visible on a closed cover with no accepted caption", () => {
  const input = {
    ...FIXTURES[2].input,
    transferState: "awaiting-open" as const,
    showIdentityTabs: false,
  };
  const markup = render({ frame: 150, input: input }),
    cover = SvgAttributes.fromMarker({ markup, marker: "folio-cover" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: cover, name: "width" }),
    264,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: cover, name: "opacity" }),
    1,
  );
  assert.ok(
    markup.indexOf("data-folio-cover=") <
      markup.lastIndexOf(`aria-label="${input.artifacts[0].label}"`),
  );
  assert.doesNotMatch(markup, /data-destination-use=/);
});

test("accepted copies unload completely outside the folio onto the destination surface", () => {
  FIXTURES.forEach(({ input: fixture }) => {
    const input = { ...fixture, transferState: "accepted" as const };
    const markup = render({ frame: 150, input: input });
    const folio = SvgAttributes.fromMarker({ markup, marker: "folio" });
    const folioLeft = SvgAttributes.getNumberFromMarkup({
      attributes: folio,
      name: "x",
    });
    const folioRight =
      folioLeft +
      SvgAttributes.getNumberFromMarkup({ attributes: folio, name: "width" });
    const bench = SvgAttributes.fromMarker({
      markup,
      marker: "destination-bench",
    });
    const benchBounds = bench.match(/d="M([\d.]+) ([\d.]+) H([\d.]+)/);
    assert.ok(benchBounds);
    input.artifacts.forEach(({ id }) => {
      const copy = markup.match(
        new RegExp(`<g data-transfer-copy="${id}">([\\s\\S]*?)<\\/g>`),
      )?.[1];
      assert.ok(copy);
      const body = SvgAttributes.fromMarker({
        markup: copy,
        marker: "artifact-body",
      });
      const left = SvgAttributes.getNumberFromMarkup({
        attributes: body,
        name: "x",
      });
      const right =
        left +
        SvgAttributes.getNumberFromMarkup({ attributes: body, name: "width" });
      const bottom =
        SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: body, name: "height" });
      assert.ok(
        right + 12 <= folioLeft || left >= folioRight + 12,
        `${id}: copy [${left}, ${right}] still occupies folio [${folioLeft}, ${folioRight}]`,
      );
      assert.ok(
        left >= Number(benchBounds[1]) && right <= Number(benchBounds[3]),
      );
      assert.ok(bottom <= Number(benchBounds[2]));
      const original = markup.match(
        new RegExp(`<g data-original="${id}">([\\s\\S]*?)<\\/g>`),
      )?.[1];
      assert.ok(original);
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({
            markup: original,
            marker: "artifact-body",
          }),
          name: "x",
        }),
        50,
      );
    });
  });
});

test("the unloading hand follows each rigid copy and stays above the open folio", () => {
  FIXTURES.forEach(({ input: fixture }) => {
    const input = { ...fixture, transferState: "accepted" as const };
    input.artifacts.forEach(({ id }, index) => {
      const markup = render({
        frame: 124 + ((index + 0.5) * 6) / input.artifacts.length,
        input: input,
      });
      const copy = markup.match(
        new RegExp(`<g data-transfer-copy="${id}">([\\s\\S]*?)<\\/g>`),
      )?.[1];
      assert.ok(copy);
      const body = SvgAttributes.fromMarker({
        markup: copy,
        marker: "artifact-body",
      });
      const hand = SvgAttributes.fromMarker({ markup, marker: "owner-hand" });
      const x = SvgAttributes.getNumberFromMarkup({
          attributes: body,
          name: "x",
        }),
        y = SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: body, name: "width" }),
        240,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: body, name: "height" }),
        80,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
        x + 120,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
        y,
      );
      assert.ok(markup.indexOf(hand) > markup.indexOf(body));
      const cover = SvgAttributes.fromMarker({ markup, marker: "folio-cover" });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: cover, name: "width" }),
        0,
      );
      const arm = SvgAttributes.fromMarker({ markup, marker: "owner-arm" });
      assert.ok(arm.includes(`L${x + 120} ${y}`));
    });
  });
});
