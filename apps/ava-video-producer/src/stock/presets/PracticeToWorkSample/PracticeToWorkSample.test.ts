import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { PracticeToWorkSample } from "./PracticeToWorkSample";
import { practiceToWorkSampleContract as contract } from "./PracticeToWorkSample.contract";
import {
  DEFAULT_INPUT,
  denseInput,
  changedInput,
  fixtures,
  invalidInputs,
} from "./PracticeToWorkSample.fixtures";
import { inputSchema, type Input } from "./PracticeToWorkSample.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(PracticeToWorkSample, {
        frame,
        input,
        accent: "#79d5bd",
        background: "#101720",
        id: "packet16",
      }),
    ),
  );
}
test("Both physical artifacts retain the same supplied measurement", () => {
  const hold = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.equal([...hold.matchAll(/data-measured-value="4"/g)].length, 2);
  assert.equal([...hold.matchAll(/data-practice-learner=/g)].length, 1);
  assert.match(
    _render({ frame: 40, input: DEFAULT_INPUT }),
    /data-measuring-hand=/,
  );
  assert.match(
    _render({ frame: 100, input: changedInput }),
    /data-measuring-hand=/,
  );
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.learnerLabel,
    input.task.instruction,
    input.settingLabels.practice,
    input.settingLabels.application,
    input.workpieces.applicationLabel,
    input.caption,
    ...(input.showFirstArtifactAtHold || frame < 112
      ? [input.workpieces.practiceLabel]
      : []),
    ...((frame > 32 && (input.showFirstArtifactAtHold || frame < 112)) ||
    frame > 90
      ? [`${input.task.value} ${input.task.unit}`]
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
  excludedTextFields: ["material"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);

test("all materials preserve values one and ten with optional guides and retained practice sheet", () => {
  (["wood", "fabric", "card"] as const).forEach((material) =>
    [1, 10].forEach((value) =>
      [true, false].forEach((showAlignmentGuides) =>
        [true, false].forEach((showFirstArtifactAtHold) => {
          const input = {
            ...denseInput,
            task: { ...denseInput.task, value },
            workpieces: { ...denseInput.workpieces, material },
            showAlignmentGuides,
            showFirstArtifactAtHold,
          };
          assert.deepEqual(inputSchema.parse(input), input);
          const markup = _render({ frame: 150, input: input });
          assert.equal(
            [...markup.matchAll(/data-practice-learner=/g)].length,
            1,
          );
          assert.equal(
            [...markup.matchAll(/data-measured-value=/g)].length,
            showFirstArtifactAtHold ? 2 : 1,
          );
          assert.equal(
            [...markup.matchAll(/data-alignment-guide=/g)].length,
            showAlignmentGuides ? (showFirstArtifactAtHold ? 2 : 1) : 0,
          );
          assert.ok(markup.includes(`data-artifact="${material}"`));
          assert.ok(markup.includes(`data-measured-value="${value}"`));
        }),
      ),
    ),
  );
});
test("both ruler gestures contact the actual growing measurement mark", () => {
  [1, 10].forEach((value) =>
    [32.001, 39, 49.999, 90.001, 97, 107.999].forEach((frame) => {
      const input = {
        ...DEFAULT_INPUT,
        task: { ...DEFAULT_INPUT.task, value },
      };
      const markup = _render({ frame: frame, input: input }),
        origin = frame < 56 ? 400 : 620;
      const pencil = markup.match(
        /data-pencil="true" d="M([-.\d]+) ([-.\d]+) L([-.\d]+) ([-.\d]+)"/,
      )!;
      const kind = frame < 56 ? "practice" : "application";
      const mark = markup.match(
        new RegExp(`data-measurement-mark="${kind}" d="M30 60 H([-.\\d]+)"`),
      )!;
      assert.ok(pencil && mark);
      assert.ok(
        Math.abs(Number(pencil[3]) - (origin - 30 + Number(mark[1]))) < 1e-9,
      );
      assert.equal(Number(pencil[4]), 330);
      const ruler = markup.match(
        /data-ruler="true" x="([-.\d]+)" y="([-.\d]+)" width="([-.\d]+)"/,
      )!;
      assert.equal(Number(ruler[1]), origin - 14);
      assert.equal(Number(ruler[2]), 336);
      assert.equal(Number(ruler[3]), value * 12 + 28);
    }),
  );
});
test("artifact and furniture travel stays clear of the complete caption lanes", () => {
  [24, 50, 55.999, 56, 56.001, 67, 77.999, 78, 78.001, 108, 150].forEach(
    (frame) => {
      const markup = _render({ frame: frame, input: denseInput });
      const artifacts = [
        ...markup.matchAll(
          /data-artifact="[^"]+" transform="translate\(([-.\d]+) ([-.\d]+)\)"/g,
        ),
      ].map((match) => [Number(match[1]), Number(match[2])]);
      artifacts.forEach(([x, y]) =>
        assert.ok(x >= 100 && x + 222 <= 812 && y >= 270 && y + 118 <= 438),
      );
      const desk = markup.match(
        /data-practice-desk="true" transform="translate\(([-.\d]+) ([-.\d]+)\)"/,
      )!;
      assert.ok(
        Number(desk[2]) + 58 < 504,
        "desk strokes clear maximum three-line artifact caption",
      );
      assert.equal(artifacts.length, 2);
    },
  );
});
