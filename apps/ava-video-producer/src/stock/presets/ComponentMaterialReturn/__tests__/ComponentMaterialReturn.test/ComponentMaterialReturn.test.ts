import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
} from "../../ComponentMaterialReturn.fixtures";
import { ComponentMaterialReturnTestState } from "./ComponentMaterialReturnTestState";

const {
  render: _render,
  getReturnedLidBounds: _getReturnedLidBounds,
  getOperatorPartSample: _getOperatorPartSample,
  assertPartsAcrossFrames: _assertPartsAcrossFrames,
  assertWholePartsFollowTheirDeclaredDataOutputShell:
    _assertWholePartsFollowTheirDeclaredDataOutputShell,
  assertWholePartsFollowTheirDeclaredDataQuantity:
    _assertWholePartsFollowTheirDeclaredDataQuantity,
  assertTheOperatorGripsEachSelectedY: _assertTheOperatorGripsEachSelectedY,
  assertTheOperatorGripsEachSelectedXY: _assertTheOperatorGripsEachSelectedXY,
  options,
} = ComponentMaterialReturnTestState;

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

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("whole parts follow their declared destination with exact identities and mass at every seek", () => {
  fixtures.forEach(({ input }) => {
    const items = [...input.parts, ...input.replacementInputs];
    const initial = _render({ frame: 24, input: input });
    _assertPartsAcrossFrames({ input, items, initial });
    const assembled =
      input.parts
        .filter((part) => {
          return part.route === "reuse" || part.route === "repair";
        })
        .reduce((sum, part) => {
          return sum + part.massKg;
        }, 0) +
      input.replacementInputs.reduce((sum, part) => {
        return sum + part.massKg;
      }, 0);
    _assertWholePartsFollowTheirDeclaredDataQuantity({ input, assembled });
    _assertWholePartsFollowTheirDeclaredDataOutputShell({ input, assembled });
  });
});

test("the operator grips each selected part while all other components remain clear", () => {
  Array.from(fixtures).forEach(({ input }) => {
    Array.from(
      { length: Math.max(0, Math.floor((108 - 36) / 0.25) + 1) },
      (_, sampleIndex) => {
        return 36 + sampleIndex * 0.25;
      },
    ).forEach((frame) => {
      const { index, phase, handX, handY, parts, selected } =
        _getOperatorPartSample({ frame, input });
      if (phase >= 1) {
        assert.equal(
          handX,
          SvgAttributes.getNumberFromMarkup({
            attributes: selected,
            name: "x",
          }) + 12,
        );
        _assertTheOperatorGripsEachSelectedY({ handY, selected });
      }
      _assertTheOperatorGripsEachSelectedXY({
        parts,
        index,
        phase,
        handX,
        handY,
        frame,
        input,
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
    [...heading.matchAll(/dy="([^"]+)"/g)].reduce((sum, match) => {
      return sum + Number(match[1]);
    }, 0) +
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
      parts.forEach(([part]) => {
        return assert.equal(part.match(/stroke="([^"]+)"/)![1], color);
      });
    });
  });
});

test("the opened lid clears the full operator shape throughout handling", () => {
  Array.from(
    { length: Math.max(0, Math.floor((108 - 36) / 0.25) + 1) },
    (_, sampleIndex) => {
      return 36 + sampleIndex * 0.25;
    },
  ).forEach((frame) => {
    const markup = _render({ frame: frame, input: fixtures[2].input });
    const { lid } = _getReturnedLidBounds(markup);
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
