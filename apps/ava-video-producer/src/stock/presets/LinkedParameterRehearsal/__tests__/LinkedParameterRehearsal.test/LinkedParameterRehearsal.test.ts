import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { linkedParameterRehearsalContract as contract } from "../../LinkedParameterRehearsal.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../LinkedParameterRehearsal.fixtures";
import { inputSchema } from "../../LinkedParameterRehearsal.schema";
import { LinkedParameterRehearsalTestState } from "./LinkedParameterRehearsalTestState";

const {
  assertRenderedGeometryInputTheCompleteAuthoredRuleMustBe:
    _assertRenderedGeometryInputTheCompleteAuthoredRuleMustBe,
  assertEveryVisiblePointerFollowsItsDataValueSourcePointerDataValueMultiplier:
    _assertAffinePointerValues,
  render,
  outputs: _outputs,
  textBlocks: _textBlocks,
  RULE_LAYOUT_INPUTS,
} = LinkedParameterRehearsalTestState;

RULE_LAYOUT_INPUTS.forEach(({ name, input }) => {
  _assertRenderedGeometryInputTheCompleteAuthoredRuleMustBe({ input, name });
  test(`hiding rules leaves every other rendered element unchanged: ${name}`, () => {
    const visible = render({ frame: 150, input: input });
    const equations = input.outputs.map((output) => {
      return `${output.multiplier} × ${input.source.label} + (${output.offset})`;
    });
    const withoutRules = _textBlocks(visible)
      .filter(({ label }) => {
        return label && equations.includes(label);
      })
      .reduce((markup, { element }) => {
        return markup.replace(element, "");
      }, visible);
    assert.equal(
      render({ frame: 150, input: { ...input, showRules: false } }),
      withoutRules,
    );
  });
});

test("every visible pointer follows its affine rule while independent outputs stay immobile", () => {
  fixtures.slice(0, 4).forEach(({ input }) => {
    const initial = _outputs(render({ frame: 24, input: input }));
    assert.equal(initial.length, input.outputs.length);
    _assertAffinePointerValues({ input, initial });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: render({ frame: 84, input: input }),
          marker: "source-pointer",
        }),
        name: "data-value",
      }),
      input.source.trial,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: render({ frame: 144, input: input }),
          marker: "source-pointer",
        }),
        name: "data-value",
      }),
      input.source.baseline,
    );
    assert.deepEqual(_outputs(render({ frame: 144, input: input })), initial);
  });
});

test("extreme spans retain a central zero and cancellation does not overflow finite affine results", () => {
  const extreme = fixtures[4].input;
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: render({ frame: 60, input: extreme }),
        marker: "source-pointer",
      }),
      name: "cx",
    }),
    515,
  );
  const input = fixtures[5].input;
  assert.equal(inputSchema.safeParse(input).success, true);
  [24, 60, 84, 120, 144].forEach((frame) => {
    const markup = render({ frame: frame, input: input });
    assert.doesNotMatch(markup, /NaN|Infinity/);
    const source = SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup,
        marker: "source-pointer",
      }),
      name: "data-value",
    });
    const expected = (2 * (source / 1e308) - 1) * 1e308;
    assert.ok(
      Math.abs(
        SvgAttributes.getNumberFromMarkup({
          attributes: _outputs(markup)[0],
          name: "data-value",
        }) /
          1e308 -
          expected / 1e308,
      ) < 1e-14,
    );
  });
});

test("rules reject unbounded computed values, empty IDs and absent coupled or independent outputs", () => {
  return invalidInputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id", "insertBeforeId", "kind", "partitionLayout"],
  getVisibleTexts: ({ input, frame }) => {
    return [
      input.contextLabel,
      input.source.label,
      input.source.unit,
      ...input.outputs.flatMap((output) => {
        return [output.label, output.unit];
      }),
      frame < 84
        ? input.phaseLabels.baseline
        : frame < 144
          ? input.phaseLabels.trial
          : input.phaseLabels.restored,
    ];
  },
  textFrames: [24, 90, 150],
});

test("every extreme-span and overflow-cancellation frame has finite bounded pointer coordinates", () => {
  fixtures.slice(4).forEach(({ input }) => {
    return Array.from({ length: 180 }, (_, frame) => {
      return frame;
    }).forEach((frame) => {
      const markup = render({ frame: frame, input: input });
      assert.doesNotMatch(markup, /NaN|Infinity/);
      [
        SvgAttributes.fromMarker({ markup, marker: "source-pointer" }),
        ..._outputs(markup),
      ].forEach((pointer) => {
        const x = SvgAttributes.getNumberFromMarkup({
          attributes: pointer,
          name: "cx",
        });
        assert.ok(x >= 380 && x <= 650);
      });
    });
  });
});
