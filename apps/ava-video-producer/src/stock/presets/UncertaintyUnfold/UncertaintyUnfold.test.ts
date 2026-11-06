/** Behavioral geometry, exact input contracts and deterministic frame seeks. */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { UncertaintyUnfold } from "./UncertaintyUnfold";
import { uncertaintyUnfoldContract as contract } from "./UncertaintyUnfold.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./UncertaintyUnfold.fixtures";
import { inputSchema, type Input } from "./UncertaintyUnfold.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(UncertaintyUnfold, {
        frame,
        input,
        accent: "#72d5bd",
        id: "uncertainty-test",
      }),
    ),
  );
test("one fixed ruler positions the estimate, both endpoints and an immovable optional reference", () => {
  fixtures.forEach(({ input }) => {
    const scale = (value: number) => {
      const fraction =
        input.axis.min === -1e308
          ? (value / 1e308 + 1) / 2
          : (value - input.axis.min) / (input.axis.max - input.axis.min);
      return 100 + 760 * fraction;
    };
    [12, 38, 72, 108, 150].forEach((frame) => {
      const markup = render({ frame: frame, input: input });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({
            markup,
            marker: "estimate-point",
          }),
          name: "cx",
        }),
        scale(input.estimate.point),
      );
      if (input.reference) {
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: SvgAttributes.fromMarker({
              markup,
              marker: "reference-blade",
            }),
            name: "x1",
          }),
          scale(input.reference.value),
        );
      } else {
        assert.ok(!markup.includes("data-reference-blade"));
      }
    });
    const hold = render({ frame: 150, input: input });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: hold,
          marker: "lower-endpoint",
        }),
        name: "x1",
      }),
      scale(input.estimate.lower),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: hold,
          marker: "upper-endpoint",
        }),
        name: "x1",
      }),
      scale(input.estimate.upper),
    );
    const band = SvgAttributes.fromMarker({
      markup: hold,
      marker: "interval-band",
    });
    assert.ok(
      Math.abs(
        SvgAttributes.getNumberFromMarkup({ attributes: band, name: "width" }) -
          (scale(input.estimate.upper) - scale(input.estimate.lower)),
      ) < 1e-9,
    );
    assert.doesNotMatch(hold, /NaN|Infinity/);
  });
});
test("folded sleeves begin at the estimate before exposing the complete interval", () => {
  const initial = SvgAttributes.fromMarker({
      markup: render({ frame: 32 }),
      marker: "interval-band",
    }),
    hold = SvgAttributes.fromMarker({
      markup: render({ frame: 108 }),
      marker: "interval-band",
    });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: initial, name: "width" }),
    0,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: hold, name: "width" }) > 0,
  );
});
test("out-of-axis estimates, inverted intervals and nonfinite bounds fail", () =>
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
  getVisibleTexts: ({ input }) => [
    input.estimate.label,
    input.axis.unit,
    input.interval.label,
    input.interpretation,
    input.contextLabel,
    ...(input.reference ? [input.reference.label] : []),
  ],
  textFrames: [150],
});
