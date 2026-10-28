import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AidCargoModeHandoff } from "./AidCargoModeHandoff";
import {
  changedInput,
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./AidCargoModeHandoff.fixtures";
import { inputSchema, type Input } from "./AidCargoModeHandoff.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(AidCargoModeHandoff, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}
test("The exact parcel identities and counts survive every carrier transfer; a parcel occupies one carrier or transfer mechanism at a time without duplication.", () => {
  const markup = _render({ frame: 150, input: changedInput });
  assert.equal((markup.match(/data-parcel=/g) ?? []).length, 2);
  assert.match(markup, /data-owner="local"/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { aidCargoModeHandoffContract } from "./AidCargoModeHandoff.contract";

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.scenarioCaption,
    input.receivingLabel,
    ...input.carriers.map(prop("handoffLabel")),
    ...(input.showParcelLabels ? input.parcels.map(prop("label")) : []),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "mode",
  "symbol",
  "transferMethod",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: aidCargoModeHandoffContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});

test("one physical parcel survives every boundary in all carrier arrangements", () => {
  fixtures.forEach(({ input }) => {
    Array.from({ length: 180 }, (_, index) => index * 1).forEach((frame) => {
      const objects = [
        ..._render({ frame: frame, input: input }).matchAll(
          /<g data-parcel="([^"]*)"[^>]*>/g,
        ),
      ];
      assert.deepEqual(
        objects.map((match) => match[1]).sort(),
        input.parcels.map(prop("id")).sort(),
      );
      objects.forEach(([attributes]) => {
        const x = _getParcelCoordinate({ attributes, axis: "x" });
        const y = _getParcelCoordinate({ attributes, axis: "y" });
        assert.ok(x >= 18 && x <= 942 && y >= 193 && y <= 300);
      });
    });
    const final = _render({ frame: 150, input: input });
    const last = input.carriers.at(-1)!.id;
    assert.equal(
      (final.match(new RegExp(`data-owner="${last}"`, "g")) ?? []).length,
      input.parcels.length,
    );
    assert.notEqual(
      _render({ frame: 24, input: input }),
      _render({ frame: 150, input: input }),
    );
  });
});
test("boat placement, adjacent duplicates and hoist without boat fail", () => {
  [
    {
      ...DEFAULT_INPUT,
      carriers: [DEFAULT_INPUT.carriers[1], DEFAULT_INPUT.carriers[0]],
    },
    {
      ...DEFAULT_INPUT,
      carriers: [
        DEFAULT_INPUT.carriers[1],
        { ...DEFAULT_INPUT.carriers[1], id: "other" },
      ],
      transferMethod: "handcart",
    },
    { ...DEFAULT_INPUT, carriers: DEFAULT_INPUT.carriers.slice(1) },
  ].forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

function _getParcelCoordinate({
  attributes,
  axis,
}: Readonly<{ attributes: string; axis: "x" | "y" }>): number {
  const transform = attributes.match(
    /transform="translate\(([^ ]+) ([^)]+)\)"/,
  );
  assert.ok(transform);
  return Number(transform[axis === "x" ? 1 : 2]);
}

test("load and carrier collection bounds reject extra objects and incomplete parcel data", () => {
  [
    {
      ...DEFAULT_INPUT,
      carriers: [...DEFAULT_INPUT.carriers, DEFAULT_INPUT.carriers[0]],
    },
    { ...DEFAULT_INPUT, parcels: [] },
    {
      ...DEFAULT_INPUT,
      parcels: Array.from({ length: 5 }, (_, index) => ({
        ...DEFAULT_INPUT.parcels[0],
        id: String(index),
      })),
    },
    {
      ...DEFAULT_INPUT,
      parcels: [{ ...DEFAULT_INPUT.parcels[0], extra: true }],
    },
  ].forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

test("each loaded carrier advances with an attached intact load before the next handoff", () => {
  fixtures.forEach(({ input }) => {
    input.carriers.slice(1).forEach((carrier, offset) => {
      const index = offset + 1;
      const isMiddle = index < input.carriers.length - 1;
      const start = index === 1 ? 66 : 112;
      const end = isMiddle ? 80 : index === 1 ? 96 : 132;
      const centers = Array.from(
        { length: end - start + 1 },
        (_, step) => start + step,
      ).map((frame) => {
        const markup = _render({ frame: frame, input: input });
        const vehicle = [
          ...markup.matchAll(/<g data-carrier="([^"]*)"[^>]*>/g),
        ].find((match) => match[1] === carrier.id);
        assert.ok(vehicle);
        const center = _getParcelCoordinate({
          attributes: vehicle[0],
          axis: "x",
        });
        const parcels = [...markup.matchAll(/<g data-parcel="[^"]*"[^>]*>/g)];
        parcels.forEach(([attributes], parcelIndex) => {
          assert.ok(attributes.includes(`data-owner="${carrier.id}"`));
          assert.ok(
            Math.abs(
              _getParcelCoordinate({ attributes, axis: "x" }) -
                center -
                (parcelIndex - (input.parcels.length - 1) / 2) * 42,
            ) < 0.000001,
          );
          assert.equal(_getParcelCoordinate({ attributes, axis: "y" }), 300);
        });
        return center;
      });
      assert.ok(
        centers[centers.length - 1] - centers[0] >= 50,
        "the loaded carrier must advance before unloading",
      );
    });
    const first = [112, 150].map(
      (frame) =>
        [
          ..._render({ frame: frame, input: input }).matchAll(
            /<g data-carrier="[^"]*"[^>]*>/g,
          ),
        ][0][0],
    );
    assert.equal(
      _getParcelCoordinate({ attributes: first[0], axis: "x" }),
      _getParcelCoordinate({ attributes: first[1], axis: "x" }),
    );
  });
});
