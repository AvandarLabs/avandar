/** Behavioral geometry, exact input contracts and deterministic frame seeks. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop, propNotEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { LinkedParameterRehearsal } from "./LinkedParameterRehearsal";
import { linkedParameterRehearsalContract as contract } from "./LinkedParameterRehearsal.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./LinkedParameterRehearsal.fixtures";
import { inputSchema, type Input } from "./LinkedParameterRehearsal.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(LinkedParameterRehearsal, {
        frame,
        input,
        accent: "#72d5bd",
        id: "linked-test",
      }),
    ),
  );
function _outputs(markup: string) {
  return [...markup.matchAll(/<circle[^>]*data-output-id="[^"]*"[^>]*>/g)].map(
    (match) => match[0],
  );
}
type TextLineBox = {
  text: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  fontSize: number;
};
/** Independent upper advances for numeric/CJK fixtures at fixed font sizes. */
function _getUpperTextWidth({
  text,
  fontSize,
}: Readonly<{ text: string; fontSize: number }>): number {
  return Array.from(text).reduce(
    (total, character) =>
      total +
      Math.ceil(
        fontSize *
          (character === "." || character === " "
            ? 0.4
            : (character.codePointAt(0) ?? 0) > 127
              ? 1.1
              : 0.75),
      ),
    0,
  );
}
function _textBlocks(markup: string): Array<{
  element: string;
  label: string | undefined;
  lines: TextLineBox[];
}> {
  return [...markup.matchAll(/<text([^>]*)>(.*?)<\/text>/g)].map(
    ([element, attributes, content]) => {
      const fontSize = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "font-size",
      });
      let baseline = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "y",
      });
      const lines: TextLineBox[] = [
        ...content.matchAll(/<tspan([^>]*)>(.*?)<\/tspan>/g),
      ].map(([, spanAttributes, text]) => {
        baseline += SvgAttributes.getNumberFromMarkup({
          attributes: spanAttributes,
          name: "dy",
        });
        const x = SvgAttributes.getNumberFromMarkup({
          attributes: spanAttributes,
          name: "x",
        });
        const width = _getUpperTextWidth({ text, fontSize });
        const left = attributes.includes('text-anchor="end"') ? x - width : x;
        return {
          text,
          left,
          right: left + width,
          top: baseline - fontSize,
          bottom: baseline + fontSize / 4,
          fontSize,
        };
      });
      return {
        element,
        label: attributes.match(/aria-label="([^"]*)"/)?.[1],
        lines,
      };
    },
  );
}
const MAXIMUM: number = Number.MAX_VALUE;
const ADJACENT: number = MAXIMUM - 2 ** 971;
const LONG_DECIMAL: -0.0000010000000000000002 = -0.0000010000000000000002;
const RULE_LAYOUT_INPUTS: Array<{ name: string; input: Input }> = [
  {
    name: "adjacent maximum ticks",
    source: {
      baseline: ADJACENT,
      trial: MAXIMUM,
      min: ADJACENT,
      max: MAXIMUM,
    },
    rules: [
      { multiplier: 1, offset: 0 },
      { multiplier: 0, offset: ADJACENT },
      { multiplier: 1, offset: 0 },
      { multiplier: 0, offset: MAXIMUM },
    ],
    min: ADJACENT,
    max: MAXIMUM,
  },
  {
    name: "long finite coefficient strings",
    source: { baseline: 0, trial: 1, min: 0, max: 1 },
    rules: [
      { multiplier: LONG_DECIMAL, offset: LONG_DECIMAL },
      { multiplier: MAXIMUM, offset: -MAXIMUM },
      { multiplier: -MAXIMUM, offset: MAXIMUM },
      { multiplier: 0, offset: LONG_DECIMAL },
    ],
    min: -MAXIMUM,
    max: MAXIMUM,
  },
].map(({ name, source, rules, min, max }) => ({
  name,
  input: {
    ...DEFAULT_INPUT,
    source: { ...source, label: "界".repeat(28), unit: "界".repeat(16) },
    outputs: rules.map((rule, index) => ({
      ...rule,
      id: `rule-${index}`,
      label: `${index}${"界".repeat(27)}`,
      unit: "界".repeat(16),
      min,
      max,
    })),
  },
}));
RULE_LAYOUT_INPUTS.forEach(({ name, input }) => {
  input.outputs.forEach((output, index) => {
    test(`complete rule avoids tick, value and neighboring label line boxes: ${name}, output ${index + 1}`, () => {
      assert.deepEqual(inputSchema.parse(input), input);
      const blocks = _textBlocks(render({ frame: 150, input: input }));
      const equation = `${output.multiplier} × ${input.source.label} + (${output.offset})`;
      const equations = input.outputs.map(
        (rule) =>
          `${rule.multiplier} × ${input.source.label} + (${rule.offset})`,
      );
      const rule = blocks.filter(
        ({ label }) => label && equations.includes(label),
      )[index];
      assert.ok(rule, "The complete authored rule must be drawn");
      assert.equal(rule.label, equation);
      assert.equal(rule.lines.map(prop("text")).join(" "), equation);
      assert.equal(
        rule.lines.length,
        1,
        "The full rule needs one reserved line",
      );
      rule.lines.forEach((line) => {
        assert.equal(line.fontSize, 12);
        assert.ok(line.left >= 0 && line.right <= 960);
        assert.ok(line.top >= 0 && line.bottom <= 600);
        blocks
          .filter((block) => block !== rule)
          .flatMap(prop("lines"))
          .forEach((other) => {
            assert.ok(
              line.right <= other.left ||
                other.right <= line.left ||
                line.bottom + 1 <= other.top ||
                other.bottom + 1 <= line.top,
              `Rule line ${line.top}..${line.bottom} overlaps ${other.text} at ${other.top}..${other.bottom}`,
            );
          });
      });
    });
  });
  test(`hiding rules leaves every other rendered element unchanged: ${name}`, () => {
    const visible = render({ frame: 150, input: input });
    const equations = input.outputs.map(
      (output) =>
        `${output.multiplier} × ${input.source.label} + (${output.offset})`,
    );
    const withoutRules = _textBlocks(visible)
      .filter(({ label }) => label && equations.includes(label))
      .reduce((markup, { element }) => markup.replace(element, ""), visible);
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
    Array.from({ length: 133 }, (_, index) => 12 + index).forEach((frame) => {
      const markup = render({ frame: frame, input: input }),
        source = SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({
            markup,
            marker: "source-pointer",
          }),
          name: "data-value",
        });
      const outputs = _outputs(markup);
      assert.equal(outputs.length, input.outputs.length);
      outputs.forEach((pointer, index) => {
        const rule = input.outputs[index],
          expected = rule.multiplier * source + rule.offset;
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: pointer,
            name: "data-value",
          }),
          expected,
        );
        assert.ok(
          Math.abs(
            SvgAttributes.getNumberFromMarkup({
              attributes: pointer,
              name: "cx",
            }) -
              (380 + (270 * (expected - rule.min)) / (rule.max - rule.min)),
          ) < 1e-9,
        );
        if (rule.multiplier === 0) {
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: pointer,
              name: "cx",
            }),
            SvgAttributes.getNumberFromMarkup({
              attributes: initial[index],
              name: "cx",
            }),
          );
        }
      });
      const couplings = [...markup.matchAll(/data-coupling-id="/g)].length;
      assert.equal(
        couplings,
        input.outputs.filter(propNotEq("multiplier", 0)).length,
      );
    });
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
test("rules reject unbounded computed values, empty IDs and absent coupled or independent outputs", () =>
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  ));

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id", "insertBeforeId", "kind", "partitionLayout"],
  getVisibleTexts: ({ input, frame }) => [
    input.contextLabel,
    input.source.label,
    input.source.unit,
    ...input.outputs.flatMap((output) => [output.label, output.unit]),
    frame < 84
      ? input.phaseLabels.baseline
      : frame < 144
        ? input.phaseLabels.trial
        : input.phaseLabels.restored,
  ],
  textFrames: [24, 90, 150],
});
test("every extreme-span and overflow-cancellation frame has finite bounded pointer coordinates", () => {
  fixtures.slice(4).forEach(({ input }) =>
    Array.from({ length: 180 }, (_, frame) => frame).forEach((frame) => {
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
    }),
  );
});
