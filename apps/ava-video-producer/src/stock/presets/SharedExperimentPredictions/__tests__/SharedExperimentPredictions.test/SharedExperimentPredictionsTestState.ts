import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SharedExperimentPredictions } from "../../SharedExperimentPredictions";
import { sharedExperimentPredictionsContract as contract } from "../../SharedExperimentPredictions.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../SharedExperimentPredictions.fixtures";
import {
  inputSchema,
  type Input,
} from "../../SharedExperimentPredictions.schema";
import type { RenderedLabelExpectation } from "../../../../../../tests/helpers/assertRenderedLabelGraphemes/RenderedLabelExpectation.types";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

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

/** Declares the complete distance copy and each learner's drawn arrow. */
function _getDistanceLabelFromLearner({
  input,
  learner,
  index,
}: Readonly<{
  input: Input;
  learner: Input["learners"][number];
  index: number;
}>): Exclude<RenderedLabelExpectation, string> {
  const paintedText = `${Math.abs(learner.predictionDistance - input.observationDistance)} ${input.track.unit}`;
  const baseline = 206 + index * 84;
  return {
    text: `↔ ${paintedText}`,
    representation: {
      kind: "distance-arrow",
      paintedText,
      path: `M192 ${baseline} H204 M195 ${baseline - 3} L192 ${baseline} L195 ${baseline + 3} M201 ${baseline - 3} L204 ${baseline} L201 ${baseline + 3}`,
    },
  };
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): RenderedLabelExpectation[] {
  return [
    input.labels.experiment,
    input.labels.prediction,
    input.labels.origin,
    input.caption,
    ...input.learners.map(prop("label")),
    `0 / ${input.track.maximum} ${input.track.unit}`,
    ...(input.showPredictionValues
      ? input.learners.map((item) => {
          return `${item.predictionDistance} ${input.track.unit}`;
        })
      : []),
    ...(frame >= 108
      ? [
          input.labels.observation,
          `${input.observationDistance} ${input.track.unit}`,
          ...(input.showDistanceDifferences
            ? input.learners.map((learner, index) => {
                return _getDistanceLabelFromLearner({ input, learner, index });
              })
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

function _flags(markup: string): number[][] {
  return [
    ...markup.matchAll(
      /data-prediction-id="[^"]*" data-prediction-distance="([-.\d]+)" transform="translate\(([-.\d]+) ([-.\d]+)\)"/g,
    ),
  ].map((match) => {
    return match.slice(1).map(Number);
  });
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const SharedExperimentPredictionsTestState = {
  render: _render,
  options,
  flags: _flags,
};
