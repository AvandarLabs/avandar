import assert from "node:assert/strict";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { ComponentMaterialReturn } from "../../ComponentMaterialReturn";
import { componentMaterialReturnContract } from "../../ComponentMaterialReturn.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../ComponentMaterialReturn.fixtures";
import { inputSchema, type Input } from "../../ComponentMaterialReturn.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

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

type GetOperatorPartSampleResult = {
  index: number;
  phase: number;
  handX: number;
  handY: number;
  parts: string[];
  selected: string;
};

type AssertPartsAcrossFramesOptions = Readonly<{
  input: Input;
  items: ReadonlyArray<{ massKg: number }>;
  initial: string;
}>;

type GetMaterialMassTotalsResult = {
  returned: number;
  replacement: number;
  recycle: number;
  residue: number;
  assembled: number;
};

function _getReturnedLidBounds(markup: string): {
  lid: { left: number; right: number; top: number; bottom: number };
} {
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
  return { lid };
}

function _getOperatorPartSample({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): GetOperatorPartSampleResult {
  const markup = _render({ frame: frame, input: input });
  const hand = SvgAttributes.fromMarker({ markup, marker: "hand" });
  const index = SvgAttributes.getNumberFromMarkup({
    attributes: hand,
    name: "data-active-part",
  });
  const phase = frame - (36 + index * 8);
  const parts = [...markup.matchAll(/<rect[^>]*data-part="\d+"[^>]*>/g)].map(
    (match) => {
      return match[0];
    },
  );
  const selected = parts[index];
  const handX = SvgAttributes.getNumberFromMarkup({
    attributes: hand,
    name: "cx",
  });
  const handY = SvgAttributes.getNumberFromMarkup({
    attributes: hand,
    name: "cy",
  });
  return { index, phase, handX, handY, parts, selected };
}

function _assertPartsAcrossFrames({
  input,
  items,
  initial,
}: AssertPartsAcrossFramesOptions): void {
  Array.from(
    { length: Math.max(0, Math.floor((120 - 24) / 0.5) + 1) },
    (_, sampleIndex) => {
      return 24 + sampleIndex * 0.5;
    },
  ).forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const parts = [...markup.matchAll(/<rect[^>]*data-part="\d+"[^>]*>/g)].map(
      (match) => {
        return match[0];
      },
    );
    assert.equal(parts.length, items.length);
    parts.forEach((part, index) => {
      _assertPartMassAndSize({ part, massKg: items[index].massKg });
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
          initial.match(new RegExp(`<rect[^>]*data-part="${index}"[^>]*>`))![0],
        );
      }
    });
  });
}

function _assertPartMassAndSize({
  part,
  massKg,
}: Readonly<{ part: string; massKg: number }>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: part,
      name: "data-mass",
    }),
    massKg,
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
}

function _getMaterialMassTotals(
  input: Readonly<Input>,
): GetMaterialMassTotalsResult {
  const returned = input.parts.reduce((sum, part) => {
    return sum + part.massKg;
  }, 0);
  const replacement = input.replacementInputs.reduce((sum, part) => {
    return sum + part.massKg;
  }, 0);
  const recycle = input.parts
    .filter(propEq("route", "recycle"))
    .reduce((sum, part) => {
      return sum + part.massKg;
    }, 0);
  const residue = input.parts
    .filter(propEq("route", "residue"))
    .reduce((sum, part) => {
      return sum + part.massKg;
    }, 0);
  const assembled =
    input.parts
      .filter((part) => {
        return part.route === "reuse" || part.route === "repair";
      })
      .reduce((sum, part) => {
        return sum + part.massKg;
      }, 0) + replacement;
  return { returned, replacement, recycle, residue, assembled };
}

type AssertTheOperatorGripsEachSelectedXYOptions = Readonly<{
  parts: Array<RegExpMatchArray[][number][number]>;
  index: ReturnType<typeof SvgAttributes.getNumberFromMarkup>;
  phase: number;
  handX: ReturnType<typeof SvgAttributes.getNumberFromMarkup>;
  handY: ReturnType<typeof SvgAttributes.getNumberFromMarkup>;
  frame: number[][number];
  input: Input;
}>;

function _assertWholePartsFollowTheirDeclaredDataOutputShell({
  input,
  assembled,
}: Readonly<{
  input: (typeof fixtures)[number]["input"];
  assembled: number;
}>): void {
  assert.equal(
    _render({ frame: 150, input: input }).includes("data-output-shell="),
    assembled > 0,
  );
}

function _assertWholePartsFollowTheirDeclaredDataQuantity({
  input,
  assembled,
}: Readonly<{
  input: (typeof fixtures)[number]["input"];
  assembled: number;
}>): void {
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
}

function _assertTheOperatorGripsEachSelectedY({
  handY,
  selected,
}: Readonly<{
  handY: ReturnType<typeof SvgAttributes.getNumberFromMarkup>;
  selected: Array<RegExpMatchArray[][number][number]>[number];
}>): void {
  assert.equal(
    handY,
    SvgAttributes.getNumberFromMarkup({
      attributes: selected,
      name: "y",
    }),
  );
}

function _assertTheOperatorGripsEachSelectedXY({
  parts,
  index,
  phase,
  handX,
  handY,
  frame,
  input,
}: AssertTheOperatorGripsEachSelectedXYOptions): void {
  parts.forEach((part, partIndex) => {
    if (partIndex === index || (partIndex === index - 1 && phase < 0.3)) {
      return;
    }
    const left =
      SvgAttributes.getNumberFromMarkup({ attributes: part, name: "x" }) - 0.5;
    const top =
      SvgAttributes.getNumberFromMarkup({ attributes: part, name: "y" }) - 0.5;
    assert.ok(
      handX + 10 <= left ||
        handX - 10 >= left + 25 ||
        handY + 3 <= top ||
        handY - 48 >= top + 25,
      `actor intersects part ${partIndex} at ${frame} for ${input.assemblyShape}`,
    );
  });
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>) {
  const { returned, replacement, recycle, residue, assembled } =
    _getMaterialMassTotals(input);
  return [
    ...Object.values(input.decision),
    input.copy.reuse,
    input.copy.repair,
    input.copy.returned,
    input.copy.output,
    input.copy.recycle,
    input.copy.residue,
    input.copy.replacement,
    ...[...input.parts, ...input.replacementInputs].map((part, index) => {
      return `${index + 1}. ${part.label}`;
    }),
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
/** Shared data and assertions for the ComponentMaterialReturn tests. */
export const ComponentMaterialReturnTestState = {
  /** Renders the selected component return frame as SVG markup. */
  render: _render,
  /** Returns the rendered shell lid bounds for clearance assertions. */
  getReturnedLidBounds: _getReturnedLidBounds,
  /** Returns hand position and selected part geometry for a rendered frame. */
  getOperatorPartSample: _getOperatorPartSample,
  /**
   * Asserts part mass, size, bounds, and initial holds across sampled frames.
   */
  assertPartsAcrossFrames: _assertPartsAcrossFrames,
  /**
   * Asserts an output shell appears only when assembled quantity is positive.
   */
  assertWholePartsFollowTheirDeclaredDataOutputShell:
    _assertWholePartsFollowTheirDeclaredDataOutputShell,
  /** Asserts the rendered assembled quantity matches its expected value. */
  assertWholePartsFollowTheirDeclaredDataQuantity:
    _assertWholePartsFollowTheirDeclaredDataQuantity,
  /** Asserts the operator hand meets the selected part vertically. */
  assertTheOperatorGripsEachSelectedY: _assertTheOperatorGripsEachSelectedY,
  /** Asserts the operator avoids parts outside the active handoff. */
  assertTheOperatorGripsEachSelectedXY: _assertTheOperatorGripsEachSelectedXY,
  /**
   * Contract, fixtures, and rendering callbacks for stock preset assertions.
   */
  options,
};
