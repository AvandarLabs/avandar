import assert from "node:assert/strict";
import test from "node:test";
import { prop, propNotEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { LinkedParameterRehearsal } from "../../LinkedParameterRehearsal";
import type {
  fixtures} from "../../LinkedParameterRehearsal.fixtures";
import {
  DEFAULT_INPUT
} from "../../LinkedParameterRehearsal.fixtures";
import { inputSchema, type Input } from "../../LinkedParameterRehearsal.schema";

function _assertRuleLineClearance({
  rule,
  blocks,
}: Readonly<{
  rule: ReturnType<typeof _textBlocks>[number];
  blocks: ReturnType<typeof _textBlocks>;
}>): void {
  rule.lines.forEach((line) => {
    assert.equal(line.fontSize, 12);
    assert.ok(line.left >= 0 && line.right <= 960);
    assert.ok(line.top >= 0 && line.bottom <= 600);
    blocks
      .filter((block) => {
        return block !== rule;
      })
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
}

type AssertEveryVisiblePointerFollowsItsDataValueOptions = Readonly<{
  outputs: ReturnType<typeof _outputs>;
  input: (typeof fixtures)[number]["input"];
  source: ReturnType<typeof SvgAttributes.getNumberFromMarkup>;
  initial: ReturnType<typeof _outputs>;
}>;

function _assertRenderedGeometryInputTheCompleteAuthoredRuleMustBe({
  input,
  name,
}: Readonly<{
  input: (typeof RULE_LAYOUT_INPUTS)[number]["input"];
  name: (typeof RULE_LAYOUT_INPUTS)[number]["name"];
}>): void {
  input.outputs.forEach((output, index) => {
    test(`complete rule avoids tick, value and neighboring label line boxes: ${name}, output ${index + 1}`, () => {
      assert.deepEqual(inputSchema.parse(input), input);
      const blocks = _textBlocks(render({ frame: 150, input: input }));
      const equation = `${output.multiplier} × ${input.source.label} + (${output.offset})`;
      const equations = input.outputs.map((rule) => {
        return `${rule.multiplier} × ${input.source.label} + (${rule.offset})`;
      });
      const rule = blocks.filter(({ label }) => {
        return label && equations.includes(label);
      })[index];
      assert.ok(rule, "The complete authored rule must be drawn");
      assert.equal(rule.label, equation);
      assert.equal(rule.lines.map(prop("text")).join(" "), equation);
      assert.equal(
        rule.lines.length,
        1,
        "The full rule needs one reserved line",
      );
      _assertRuleLineClearance({ rule, blocks });
    });
  });
}

function _assertAffinePointerValues({
  input,
  initial,
}: Readonly<{
  input: (typeof fixtures)[number]["input"];
  initial: ReturnType<typeof _outputs>;
}>): void {
  Array.from({ length: 133 }, (_, index) => {
    return 12 + index;
  }).forEach((frame) => {
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
    _assertEveryVisiblePointerFollowsItsDataValue({
      outputs,
      input,
      source,
      initial,
    });
    const couplings = [...markup.matchAll(/data-coupling-id="/g)].length;
    assert.equal(
      couplings,
      input.outputs.filter(propNotEq("multiplier", 0)).length,
    );
  });
}

function _assertEveryVisiblePointerFollowsItsDataValue({
  outputs,
  input,
  source,
  initial,
}: AssertEveryVisiblePointerFollowsItsDataValueOptions): void {
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
}

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
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
};

function _outputs(markup: string) {
  return [...markup.matchAll(/<circle[^>]*data-output-id="[^"]*"[^>]*>/g)].map(
    (match) => {
      return match[0];
    },
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
  return Array.from(text).reduce((total, character) => {
    return (
      total +
      Math.ceil(
        fontSize *
          (character === "." || character === " "
            ? 0.4
            : (character.codePointAt(0) ?? 0) > 127
              ? 1.1
              : 0.75),
      )
    );
  }, 0);
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
].map(({ name, source, rules, min, max }) => {
  return {
    name,
    input: {
      ...DEFAULT_INPUT,
      source: { ...source, label: "界".repeat(28), unit: "界".repeat(16) },
      outputs: rules.map((rule, index) => {
        return {
          ...rule,
          id: `rule-${index}`,
          label: `${index}${"界".repeat(27)}`,
          unit: "界".repeat(16),
          min,
          max,
        };
      }),
    },
  };
});
/** Shared data and assertions for the LinkedParameterRehearsal tests. */
export const LinkedParameterRehearsalTestState = {
  /**
   * Registers assertions that complete rule labels remain legible and
   * separated.
   */
  assertRenderedGeometryInputTheCompleteAuthoredRuleMustBe:
    _assertRenderedGeometryInputTheCompleteAuthoredRuleMustBe,
  /**
   * Asserts each sampled pointer follows its rule and only coupled rules link.
   */
  assertEveryVisiblePointerFollowsItsDataValueSourcePointerDataValueMultiplier:
    _assertAffinePointerValues,
  /** Renders the selected linked-parameter frame as SVG markup. */
  render,
  /** Returns the rendered output pointer circles for rule assertions. */
  outputs: _outputs,
  /** Returns SVG text blocks and their estimated line bounds. */
  textBlocks: _textBlocks,
  /** Rule fixtures with labels that exercise reserved equation line bounds. */
  RULE_LAYOUT_INPUTS,
};
