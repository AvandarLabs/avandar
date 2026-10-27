import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SharedExperimentPredictions } from "./SharedExperimentPredictions";
import { sharedExperimentPredictionsContract as contract } from "./SharedExperimentPredictions.contract";
import {
  DEFAULT_INPUT,
  denseInput,
  fixtures,
  invalidInputs,
} from "./SharedExperimentPredictions.fixtures";
import { inputSchema, type Input } from "./SharedExperimentPredictions.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(SharedExperimentPredictions, {
        frame,
        input,
        accent: "#79d5bd",
        background: "#101720",
        id: "packet16",
      }),
    ),
  );
}
test("Every prediction precedes release and remains at its authored position", () => {
  const before = _render({ frame: 70, input: DEFAULT_INPUT });
  const hold = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.equal([...before.matchAll(/data-prediction-id=/g)].length, 3);
  assert.doesNotMatch(before, /data-observation-distance=/);
  assert.equal([...hold.matchAll(/data-prediction-id=/g)].length, 3);
  assert.match(hold, /data-observation-distance="18"/);
  assert.match(hold, /data-ball-distance="18"/);
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.labels.experiment,
    input.labels.prediction,
    input.labels.origin,
    input.caption,
    ...input.learners.map(prop("label")),
    `0 / ${input.track.maximum} ${input.track.unit}`,
    ...(input.showPredictionValues
      ? input.learners.map(
          (item) => `${item.predictionDistance} ${input.track.unit}`,
        )
      : []),
    ...(frame >= 108
      ? [
          input.labels.observation,
          `${input.observationDistance} ${input.track.unit}`,
          ...(input.showDistanceDifferences
            ? input.learners.map(
                (item) =>
                  `↔ ${Math.abs(item.predictionDistance - input.observationDistance)} ${input.track.unit}`,
              )
            : []),
        ]
      : []),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: ["id"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);

function _flags(markup: string): number[][] {
  return [
    ...markup.matchAll(
      /data-prediction-id="[^"]*" data-prediction-distance="([-.\d]+)" transform="translate\(([-.\d]+) ([-.\d]+)\)"/g,
    ),
  ].map((match) => match.slice(1).map(Number));
}
test("four coincident endpoint predictions retain separate flags and learners after observation", () => {
  [0, 100].forEach((distance) =>
    [true, false].forEach((showPredictionValues) =>
      [true, false].forEach((showDistanceDifferences) => {
        const input = {
          ...denseInput,
          learners: [...denseInput.learners]
            .reverse()
            .map((learner) => ({ ...learner, predictionDistance: distance })),
          observationDistance: distance,
          showPredictionValues,
          showDistanceDifferences,
        };
        const before = _render({ frame: 70, input: input }),
          hold = _render({ frame: 150, input: input });
        assert.deepEqual(_flags(before), _flags(hold));
        assert.equal(_flags(hold).length, 4);
        assert.equal(
          new Set(_flags(hold).map(([, x, y]) => `${x},${y}`)).size,
          4,
        );
        assert.equal([...hold.matchAll(/data-experiment-learner=/g)].length, 4);
        assert.ok(hold.includes(`data-ball-distance="${distance}"`));
        assert.equal(
          [...hold.matchAll(/data-distance-bracket=/g)].length,
          showDistanceDifferences ? 4 : 0,
        );
        assert.doesNotMatch(before, /data-observation-distance=/);
      }),
    ),
  );
});
test("participant hands carry flags with full identity separation across planting joins", () => {
  [
    denseInput,
    {
      ...denseInput,
      learners: denseInput.learners.map((learner, index) => ({
        ...learner,
        predictionDistance: index % 2 ? 0 : 100,
      })),
    },
  ].forEach((input) => {
    [36, 42, 48, 54, 60, 66, 76, 86, 108]
      .flatMap((frame) => [frame - 0.001, frame, frame + 0.001])
      .forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        const learners = [
          ...markup.matchAll(
            /data-experiment-learner="([^"]*)" transform="translate\(([-.\d]+) ([-.\d]+)\)"/g,
          ),
        ];
        learners.forEach(([, id, x, y]) => {
          const flag = markup.match(
            new RegExp(
              `data-prediction-id="${id}"[^>]*transform="translate\\(([-.\\d]+) ([-.\\d]+)\\)"`,
            ),
          );
          if (flag) {
            assert.equal(Number(flag[1]) - Number(x), 25);
            assert.equal(Number(flag[2]), Number(y));
          }
          assert.ok(Number(x) - 12 >= 413 && Number(x) + 52 <= 907);
          assert.ok(Number(y) - 25 >= 155 && Number(y) + 39 <= 471);
        });
        _flags(markup).forEach(([, x, y], index, flags) =>
          flags
            .slice(index + 1)
            .forEach(([, otherX, otherY]) =>
              assert.ok(Math.abs(x - otherX) > 28 || Math.abs(y - otherY) > 66),
            ),
        );
      });
  });
});
test("small fractional distances preserve exact authored values and absolute differences", () => {
  const input = {
    ...denseInput,
    observationDistance: 1e-7,
    learners: denseInput.learners.map((learner, index) => ({
      ...learner,
      predictionDistance: index ? 1.0000000000000002e-7 : 0,
    })),
  };
  assert.deepEqual(inputSchema.parse(input), input);
  assert.doesNotThrow(() => _render({ frame: 150, input: input }));
  input.learners.forEach((learner) =>
    assert.ok(
      _render({ frame: 150, input: input }).includes(
        `data-prediction-distance="${learner.predictionDistance}"`,
      ),
    ),
  );
});
