import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { chartFocusEditContract as contract } from "../ChartFocusEdit.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../ChartFocusEdit.fixtures";
import { inputSchema, type Input } from "../ChartFocusEdit.schema";
import { _render, _assertContextPlacement } from "./ChartFocusEditTestHelpers";

registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "focusId", "treatment"],
});

test("editorial treatments preserve each bar length and the common scale", () => {
  fixtures.forEach(({ input }) => {
    const bars = (markup: string) =>
      [...markup.matchAll(/<rect data-chart-bar="[^"]*"[^>]*>/g)].map(
        (match) => [
          SvgAttributes.getNumberFromMarkup({
            attributes: match[0],
            name: "x",
          }),
          SvgAttributes.getNumberFromMarkup({
            attributes: match[0],
            name: "y",
          }),
          SvgAttributes.getNumberFromMarkup({
            attributes: match[0],
            name: "width",
          }),
        ],
      );
    const setup = _render({ frame: 36, input: input }),
      middle = _render({ frame: 76, input: input }),
      hold = _render({ frame: 150, input: input });
    assert.equal(bars(setup).length, input.categories.length);
    assert.deepEqual(bars(setup), bars(middle));
    assert.deepEqual(bars(setup), bars(hold));
    assert.equal(
      bars(hold)[0][2],
      (input.categories[0].value / input.axisMaximum) * 400,
    );
    assert.ok(hold.includes(`data-axis-maximum="${input.axisMaximum}"`));
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: setup,
          marker: "minor-grid",
        }),
        name: "opacity",
      }),
      0.5,
    );
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: middle,
          marker: "minor-grid",
        }),
        name: "opacity",
      }) < 0.5,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: hold,
          marker: "minor-grid",
        }),
        name: "opacity",
      }),
      0.06,
    );
  });
});

test("focus selection changes emphasis while direct-labels alone only move labels", () => {
  const both = _render({ frame: 150 }),
    other = _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, focusId: "paper" },
    });
  const focused = (markup: string) =>
    [...markup.matchAll(/data-bar-emphasis="([^"]*)" opacity="([^"]*)"/g)]
      .filter((match) => Number(match[2]) === 1)
      .map((match) => match[1]);
  assert.deepEqual(focused(both), ["ink"]);
  assert.deepEqual(focused(other), ["paper"]);
  assert.deepEqual(
    focused(
      _render({
        frame: 150,
        input: {
          ...DEFAULT_INPUT,
          treatment: "direct-labels",
          focusId: null,
        },
      }),
    ),
    ["paper", "ink", "labels"],
  );
  assert.notEqual(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 36 }),
      marker: "category-label",
    }),
    SvgAttributes.fromMarker({ markup: both, marker: "category-label" }),
  );
  assert.equal(
    SvgAttributes.fromMarker({
      markup: _render({
        frame: 36,
        input: { ...DEFAULT_INPUT, treatment: "focus" },
      }),
      marker: "category-label",
    }),
    SvgAttributes.fromMarker({
      markup: _render({
        frame: 150,
        input: { ...DEFAULT_INPUT, treatment: "focus" },
      }),
      marker: "category-label",
    }),
  );
  assert.doesNotMatch(
    _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, showValueLabels: false },
    }),
    /data-value-label=/,
  );
  assert.match(
    _render({ frame: 150, input: { ...DEFAULT_INPUT, showBeforeGuide: true } }),
    /data-before-guide=/,
  );
});

test("an empty focus reference selects its exact existing empty category ID", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    categories: [
      { ...DEFAULT_INPUT.categories[0], id: "" },
      ...DEFAULT_INPUT.categories.slice(1),
    ],
    focusId: "",
  };
  assert.deepEqual(inputSchema.parse(input), input);
  assert.match(
    _render({ frame: 150, input: input }),
    /data-bar-emphasis="" opacity="1"/,
  );
  assert.equal(
    inputSchema.safeParse({ ...input, focusId: "missing" }).success,
    false,
  );
});

test("focus and both settle an authored context heading beside the selected category", () => {
  const dense: Input = {
    ...fixtures[2].input,
    focusId: fixtures[2].input.categories.at(-1)!.id,
    categories: fixtures[2].input.categories.map((category) => ({
      ...category,
      label: "界".repeat(22),
    })),
    headings: {
      ...fixtures[2].input.headings,
      after: `界 ${"界".repeat(19)} ${"界".repeat(6)}`,
    },
  };
  [DEFAULT_INPUT, dense].forEach((source) =>
    ["focus", "both"].forEach((treatment) =>
      [true, false].forEach((showValueLabels) => {
        const input: Input = {
          ...source,
          treatment: treatment as Input["treatment"],
          showValueLabels,
          showBeforeGuide: true,
        };
        assert.match(
          SvgAttributes.fromMarker({
            markup: _render({ frame: 36, input: input }),
            marker: "context",
          }),
          /opacity="0"/,
        );
        [104, 108, 112, 150].forEach((frame) =>
          _assertContextPlacement({ input, frame }),
        );
      }),
    ),
  );
  assert.doesNotMatch(
    _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, treatment: "direct-labels", focusId: null },
    }),
    /data-context=/,
  );
});

test("refined chart copy retains category and value association with each bar", async () => {
  const { chartFocusEditContract: correctionContract } =
    await import("../ChartFocusEdit.contract");
  const { ChartFocusEdit: Component } = await import("../ChartFocusEdit");
  const { SvgPaintAssertions } =
    await import("../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions");
  Array.from([
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ]).forEach((source) => {
    const input = { ...source };
    const markup = renderToStaticMarkup(
      createElement(Component, {
        input,
        frame: 150,
        accent: "#9fefca",
        id: "correction",
      }),
    );
    input.categories.forEach((category, index) => {
      const label = markup.match(
        new RegExp(
          `data-category-label="${category.id}" transform="translate\\(([^ ]*) ([^)]*)\\)"`,
        ),
      );
      const value = markup.match(
        new RegExp(`data-value-label="${category.id}"[^>]*\\sy="([^"]*)"`),
      );
      assert.ok(label && value);
      const centerY = 184 + index * 72;
      assert.ok(
        Math.abs(Number(label[2]) - centerY) <= 14,
        "Category belongs to its bar row",
      );
      assert.ok(
        Math.abs(Number(value[1]) - centerY) <= 6,
        "Value belongs to its bar row",
      );
    });

    const stageLabels = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      markup,
    ).filter(
      (item) => item.kind === "text" && item.ariaLabel === input.headings.after,
    );
    assert.equal(
      stageLabels.length,
      1,
      "Stage copy appears once in visible paint",
    );
  });
});
