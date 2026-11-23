import { SharedExperimentPredictionsTestState } from "./SharedExperimentPredictionsTestState";

const {
  render: _render,
  options,
  flags: _flags,
} = SharedExperimentPredictionsTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import {
  DEFAULT_INPUT,
  denseInput,
} from "../../SharedExperimentPredictions.fixtures";
import { inputSchema } from "../../SharedExperimentPredictions.schema";
import { assertParticipantHandsCarryFlagsInput as _assertParticipantHandsCarryFlagsInput } from "./assertParticipantHandsCarryFlagsInput";

test("Every prediction precedes release and remains at its authored position", () => {
  const before = _render({ frame: 70, input: DEFAULT_INPUT });
  const hold = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.equal([...before.matchAll(/data-prediction-id=/g)].length, 3);
  assert.doesNotMatch(before, /data-observation-distance=/);
  assert.equal([...hold.matchAll(/data-prediction-id=/g)].length, 3);
  assert.match(hold, /data-observation-distance="18"/);
  assert.match(hold, /data-ball-distance="18"/);
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("four coincident endpoint predictions retain separate flags and learners after observation", () => {
  [0, 100].forEach((distance) => {
    return [true, false].forEach((showPredictionValues) => {
      return [true, false].forEach((showDistanceDifferences) => {
        const input = {
          ...denseInput,
          learners: [...denseInput.learners].reverse().map((learner) => {
            return { ...learner, predictionDistance: distance };
          }),
          observationDistance: distance,
          showPredictionValues,
          showDistanceDifferences,
        };
        const before = _render({ frame: 70, input: input }),
          hold = _render({ frame: 150, input: input });
        assert.deepEqual(_flags(before), _flags(hold));
        assert.equal(_flags(hold).length, 4);
        assert.equal(
          new Set(
            _flags(hold).map(([, x, y]) => {
              return `${x},${y}`;
            }),
          ).size,
          4,
        );
        assert.equal([...hold.matchAll(/data-experiment-learner=/g)].length, 4);
        assert.ok(hold.includes(`data-ball-distance="${distance}"`));
        assert.equal(
          [...hold.matchAll(/data-distance-bracket=/g)].length,
          showDistanceDifferences ? 4 : 0,
        );
        assert.doesNotMatch(before, /data-observation-distance=/);
      });
    });
  });
});

test("participant hands carry flags with full identity separation across planting joins", () => {
  [
    denseInput,
    {
      ...denseInput,
      learners: denseInput.learners.map((learner, index) => {
        return { ...learner, predictionDistance: index % 2 ? 0 : 100 };
      }),
    },
  ].forEach((input) => {
    return _assertParticipantHandsCarryFlagsInput(input);
  });
});

test("small fractional distances preserve exact authored values and absolute differences", () => {
  const input = {
    ...denseInput,
    observationDistance: 1e-7,
    learners: denseInput.learners.map((learner, index) => {
      return {
        ...learner,
        predictionDistance: index ? 1.0000000000000002e-7 : 0,
      };
    }),
  };
  assert.deepEqual(inputSchema.parse(input), input);
  assert.doesNotThrow(() => {
    return _render({ frame: 150, input: input });
  });
  input.learners.forEach((learner) => {
    return assert.ok(
      _render({ frame: 150, input: input }).includes(
        `data-prediction-distance="${learner.predictionDistance}"`,
      ),
    );
  });
});
