import { SharedJigPreparationTestState } from "./SharedJigPreparationTestState";

const { render, options } = SharedJigPreparationTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "../../SharedJigPreparation.fixtures";
import { inputSchema } from "../../SharedJigPreparation.schema";
import { assertMarkingHandsContactSelectedPattern as _assertMarkingHandsContactSelectedPattern } from "./assertMarkingHandsContactSelectedPattern";

test("all authored fixtures are accepted and every rejection fixture fails", () => {
  FIXTURES.forEach(({ input }) => {
    return assert.deepEqual(inputSchema.parse(input), input);
  });
  invalidInputs.forEach((input) => {
    return assert.equal(
      inputSchema.safeParse(input).success,
      false,
      JSON.stringify(input),
    );
  });
});

test("one guide leaves matching marks on each existing workpiece exactly once", () => {
  const input = FIXTURES[3].input;
  const setup = render({ frame: 30, input: input }),
    hold = render({ frame: 150, input: input });
  assert.equal((hold.match(/data-guide="one"/g) || []).length, 1);
  assert.equal((setup.match(/data-workpiece=/g) || []).length, 3);
  assert.equal((hold.match(/data-workpiece=/g) || []).length, 3);
  assert.equal((setup.match(/data-application=/g) || []).length, 0);
  assert.equal((hold.match(/data-application=/g) || []).length, 3);
  assert.equal((hold.match(/data-corner-mark=/g) || []).length, 4);
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockDefaultTextAssertions({
  contract: options.contract,
  suppliedInputs: FIXTURES.map(prop("input")),
  expectedTextPaths: [
    ["makerLabel"],
    ["guide", "label"],
    ["collaborators", 0, "label"],
    ["collaborators", 0, "workpieceLabel"],
    ["collaborators", 1, "label"],
    ["collaborators", 1, "workpieceLabel"],
    ["labels", "prepare"],
    ["labels", "apply"],
    ["labels", "retained"],
    ["labels", "example"],
  ],
});

test("guide carries with a contacting hand and applications follow every input station in order", () => {
  ["two-holes", "corner-mark"].forEach((pattern) => {
    const input = inputSchema.parse({
      ...FIXTURES[3].input,
      guide: { ...DEFAULT_INPUT.guide, pattern },
    });
    const duration = 73 / input.collaborators.length;
    input.collaborators.forEach(({ id }, index) => {
      const before = render({
        frame: 49 + index * duration + duration * 0.6,
        input: input,
      });
      const after = render({
        frame: 49 + index * duration + duration * 0.8,
        input: input,
      });
      assert.equal((before.match(/data-application=/g) || []).length, index);
      assert.equal((after.match(/data-application=/g) || []).length, index + 1);
      assert.ok(after.includes(`data-marking-hand="${id}"`));
    });
    [49, 55, 70, 90, 110, 124, 127, 150].forEach((frame) => {
      const markup = render({ frame: frame, input: input }),
        hand = SvgAttributes.fromMarker({ markup, marker: "guide-hand" });
      const body = SvgAttributes.fromMarker({ markup, marker: "guide-body" });
      const coordinates = body.match(/d="M([^ ]+) ([^ ]+) /);
      assert.ok(coordinates);
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
        Number(coordinates[1]),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
        Number(coordinates[2]) + 32,
      );
      assert.ok(
        markup.indexOf("data-guide-body=") < markup.indexOf("data-guide-hand="),
      );
    });
  });
});

test("guide caption follows the single moving guide instead of staying at its source", () => {
  const first = render({ frame: 30, input: DEFAULT_INPUT }),
    travelling = render({ frame: 90, input: DEFAULT_INPUT });
  const label = (markup: string) => {
    return (
      markup.match(/<text[^>]*aria-label="Marking guide"[^>]*>/)?.[0] ?? ""
    );
  };
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: label(first), name: "x" }),
    SvgAttributes.getNumberFromMarkup({
      attributes: label(travelling),
      name: "x",
    }),
  );
});

test("marking hands contact the selected cutout and paint above the opaque guide", () => {
  ["two-holes", "corner-mark"].forEach((pattern) => {
    return _assertMarkingHandsContactSelectedPattern(pattern);
  });
});
