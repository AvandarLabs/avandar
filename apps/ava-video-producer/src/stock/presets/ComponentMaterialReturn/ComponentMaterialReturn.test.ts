import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ComponentMaterialReturn } from "./ComponentMaterialReturn";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
} from "./ComponentMaterialReturn.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>) {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ComponentMaterialReturn, {
        frame,
        input,
        accent: "#78d4bc",
        id: "test",
      }),
    ),
  );
}
test("changed authored quantities reach their visible conserved destination", () => {
  const markup = _render({ frame: 150, input: CHANGED_INPUT });
  const attributes = SvgAttributes.fromMarker({ markup, marker: "assembled" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes, name: "data-quantity" }),
    2,
  );
  assert.notEqual(markup, _render({ frame: 24, input: CHANGED_INPUT }));
});

test("the physical object changes geometry while preserving its intact extent", () => {
  const before = SvgAttributes.fromMarker({
    markup: _render({ frame: 24 }),
    marker: "part",
  });
  const after = SvgAttributes.fromMarker({
    markup: _render({ frame: 150 }),
    marker: "part",
  });
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "x" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "width" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "width" }),
  );
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { componentMaterialReturnContract } from "./ComponentMaterialReturn.contract";
import { inputSchema, type Input } from "./ComponentMaterialReturn.schema";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>) {
  const returned = input.parts.reduce((sum, part) => sum + part.massKg, 0);
  const replacement = input.replacementInputs.reduce(
    (sum, part) => sum + part.massKg,
    0,
  );
  const recycle = input.parts
    .filter(propEq("route", "recycle"))
    .reduce((sum, part) => sum + part.massKg, 0);
  const residue = input.parts
    .filter(propEq("route", "residue"))
    .reduce((sum, part) => sum + part.massKg, 0);
  const assembled =
    input.parts
      .filter((part) => part.route === "reuse" || part.route === "repair")
      .reduce((sum, part) => sum + part.massKg, 0) + replacement;
  return [
    ...Object.values(input.decision),
    input.copy.reuse,
    input.copy.repair,
    input.copy.returned,
    input.copy.output,
    input.copy.recycle,
    input.copy.residue,
    input.copy.replacement,
    ...[...input.parts, ...input.replacementInputs].map(
      (part, index) => `${index + 1}. ${part.label}`,
    ),
    ...(input.showMassEquation
      ? [
          `${returned} + ${replacement} = ${assembled} + ${recycle} + ${residue} ${input.copy.unit}`,
        ]
      : []),
    input.copy.disclaimer,
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: componentMaterialReturnContract,
  render: _render,
  excludedTextFields: [
    "id",
    "initialHostId",
    "finalHostId",
    "zoneId",
    "kind",
    "route",
    "stage",
    "assemblyShape",
    "overflowSide",
    "emptyHostState",
  ],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);

test("whole parts follow their declared destination with exact identities and mass at every seek", () => {
  fixtures.forEach(({ input }) => {
    const items = [...input.parts, ...input.replacementInputs];
    const initial = _render({ frame: 24, input: input });
    Array.from(
      { length: Math.max(0, Math.floor((120 - 24) / 0.5) + 1) },
      (_, sampleIndex) => 24 + sampleIndex * 0.5,
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const parts = [
        ...markup.matchAll(/<rect[^>]*data-part="\d+"[^>]*>/g),
      ].map((match) => match[0]);
      assert.equal(parts.length, items.length);
      parts.forEach((part, index) => {
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: part,
            name: "data-mass",
          }),
          items[index].massKg,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: part,
            name: "width",
          }),
          24,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: part,
            name: "height",
          }),
          24,
        );
        const x = SvgAttributes.getNumberFromMarkup({
          attributes: part,
          name: "x",
        });
        const y = SvgAttributes.getNumberFromMarkup({
          attributes: part,
          name: "y",
        });
        assert.ok(x >= 65 && x + 24 <= 914 && y >= 250 && y + 24 <= 389);
        if (frame < 37 + index * 8) {
          assert.equal(
            part,
            initial.match(
              new RegExp(`<rect[^>]*data-part="${index}"[^>]*>`),
            )![0],
          );
        }
      });
    });
    const assembled =
      input.parts
        .filter((part) => part.route === "reuse" || part.route === "repair")
        .reduce((sum, part) => sum + part.massKg, 0) +
      input.replacementInputs.reduce((sum, part) => sum + part.massKg, 0);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: _render({ frame: 150, input: input }),
          marker: "assembled",
        }),
        name: "data-quantity",
      }),
      assembled,
    );
    assert.equal(
      _render({ frame: 150, input: input }).includes("data-output-shell="),
      assembled > 0,
    );
  });
});
test("the operator grips each selected part while all other components remain clear", () => {
  Array.from(fixtures).forEach(({ input }) => {
    Array.from(
      { length: Math.max(0, Math.floor((108 - 36) / 0.25) + 1) },
      (_, sampleIndex) => 36 + sampleIndex * 0.25,
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const hand = SvgAttributes.fromMarker({ markup, marker: "hand" });
      const index = SvgAttributes.getNumberFromMarkup({
        attributes: hand,
        name: "data-active-part",
      });
      const phase = frame - (36 + index * 8);
      const parts = [
        ...markup.matchAll(/<rect[^>]*data-part="\d+"[^>]*>/g),
      ].map((match) => match[0]);
      const selected = parts[index];
      const handX = SvgAttributes.getNumberFromMarkup({
        attributes: hand,
        name: "cx",
      });
      const handY = SvgAttributes.getNumberFromMarkup({
        attributes: hand,
        name: "cy",
      });
      if (phase >= 1) {
        assert.equal(
          handX,
          SvgAttributes.getNumberFromMarkup({
            attributes: selected,
            name: "x",
          }) + 12,
        );
        assert.equal(
          handY,
          SvgAttributes.getNumberFromMarkup({
            attributes: selected,
            name: "y",
          }),
        );
      }
      parts.forEach((part, partIndex) => {
        if (partIndex === index || (partIndex === index - 1 && phase < 0.3)) {
          return;
        }
        const left =
          SvgAttributes.getNumberFromMarkup({ attributes: part, name: "x" }) -
          0.5;
        const top =
          SvgAttributes.getNumberFromMarkup({ attributes: part, name: "y" }) -
          0.5;
        assert.ok(
          handX + 10 <= left ||
            handX - 10 >= left + 25 ||
            handY + 3 <= top ||
            handY - 48 >= top + 25,
          `actor intersects part ${partIndex} at ${frame} for ${input.assemblyShape}`,
        );
      });
    });
  });
});
test("hidden equation retains separate visible destination masses", () => {
  const markup = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showMassEquation: false },
  });
  assert.match(markup, /aria-label="8 kg"/);
  assert.match(markup, /aria-label="3 kg"/);
  assert.match(markup, /aria-label="1 kg"/);
});

test("the returned heading clears the next full wrapped caption", () => {
  const input = {
    ...fixtures[2].input,
    copy: {
      ...fixtures[2].input.copy,
      returned: `界 ${"界".repeat(18)} ${"界".repeat(9)}`,
    },
  };
  const markup = _render({ frame: 150, input: input });
  const heading = markup.match(
    /<text[^>]* x="50" y="70"[^>]*>(.*?)<\/text>/,
  )![1];
  const bottom =
    70 +
    [...heading.matchAll(/dy="([^"]+)"/g)].reduce(
      (sum, match) => sum + Number(match[1]),
      0,
    ) +
    3.6;
  const reuse = markup.match(
    /<text[^>]* x="45" y="(1\d+)"[^>]*><tspan[^>]*>W/,
  )![1];
  assert.ok(bottom < Number(reuse) - 12);
});

test("visible route keys own the corresponding parts through their full paths", () => {
  Array.from([24, 40, 65, 89, 108, 150]).forEach((frame) => {
    const markup = _render({ frame: frame });
    Array.from([
      "reuse",
      "repair",
      "recycle",
      "residue",
      "replacement",
    ]).forEach((route) => {
      const key = markup.match(
        new RegExp(`<rect[^>]*data-route-key="${route}"[^>]*>`),
      )?.[0];
      assert.ok(key, `missing visible ${route} key`);
      const color = key.match(/fill="([^"]+)"/)![1];
      const parts = [
        ...markup.matchAll(
          new RegExp(
            `<rect[^>]*data-part="[^"]+"[^>]*data-route="${route}"[^>]*>`,
            "g",
          ),
        ),
      ];
      assert.ok(parts.length > 0);
      parts.forEach(([part]) =>
        assert.equal(part.match(/stroke="([^"]+)"/)![1], color),
      );
    });
  });
});

test("the opened lid clears the full operator shape throughout handling", () => {
  Array.from(
    { length: Math.max(0, Math.floor((108 - 36) / 0.25) + 1) },
    (_, sampleIndex) => 36 + sampleIndex * 0.25,
  ).forEach((frame) => {
    const markup = _render({ frame: frame, input: fixtures[2].input });
    const shell = SvgAttributes.fromMarker({
      markup,
      marker: "returned-shell",
    });
    const horizontal = shell.match(/M50 ([\d.]+)H([\d.]+)/);
    const hinged = shell.match(/M50 290L([\d.]+) ([\d.]+)/);
    assert.ok(horizontal || hinged);
    const lid = horizontal
      ? {
          left: 50,
          right: Number(horizontal[2]),
          top: Number(horizontal[1]),
          bottom: Number(horizontal[1]),
        }
      : {
          left: 50,
          right: Number(hinged![1]),
          top: Number(hinged![2]),
          bottom: 290,
        };
    const hand = SvgAttributes.fromMarker({ markup, marker: "hand" });
    const x = SvgAttributes.getNumberFromMarkup({
      attributes: hand,
      name: "cx",
    });
    const y = SvgAttributes.getNumberFromMarkup({
      attributes: hand,
      name: "cy",
    });
    assert.ok(
      x + 10 < lid.left - 1.5 ||
        x - 10 > lid.right + 1.5 ||
        y + 3 < lid.top - 1.5 ||
        y - 48 > lid.bottom + 1.5,
      `operator crosses lid at ${frame}`,
    );
  });
});
