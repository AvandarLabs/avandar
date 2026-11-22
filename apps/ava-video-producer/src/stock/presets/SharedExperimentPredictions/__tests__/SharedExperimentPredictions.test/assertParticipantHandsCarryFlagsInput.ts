import { SharedExperimentPredictionsTestState } from "./SharedExperimentPredictionsTestState";

const { render: _render, flags: _flags } = SharedExperimentPredictionsTestState;

import assert from "node:assert/strict";
import type { denseInput } from "../../SharedExperimentPredictions.fixtures";

/**
 * Asserts participant hands carry flags with full identity separation across
 * planting joins.
 */
export function assertParticipantHandsCarryFlagsInput(
  input:
    | typeof denseInput
    | (Omit<typeof denseInput, "learners"> & {
        learners: Array<
          Omit<
            (typeof denseInput)["learners"][number],
            "predictionDistance"
          > & { predictionDistance: number }
        >;
      }),
): void {
  [36, 42, 48, 54, 60, 66, 76, 86, 108]
    .flatMap((frame) => {
      return [frame - 0.001, frame, frame + 0.001];
    })
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
      _flags(markup).forEach(([, x, y], index, flags) => {
        return flags.slice(index + 1).forEach(([, otherX, otherY]) => {
          return assert.ok(
            Math.abs(x - otherX) > 28 || Math.abs(y - otherY) > 66,
          );
        });
      });
    });
}
